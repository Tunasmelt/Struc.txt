import { z } from 'zod'

export type TemplateFieldType =
  | 'text'
  | 'longtext'
  | 'checklist'
  | 'tags'
  | 'list'
  | 'date'
  | 'number'
  | 'select'

export interface TemplateField {
  key: string
  label: string
  type: TemplateFieldType
  required?: boolean
  order?: number
  options?: string[]
}

export interface TemplateLike {
  id: string
  name: string
  fields: TemplateField[]
}

const ChecklistItemSchema = z.object({
  item: z.string(),
  done: z.boolean().default(false),
})

/** Maps one of the 7 spec field types to a Zod type. `required` controls
 *  whether the field is mandatory; everything else gets a sensible default
 *  so a partially-populated LLM response still validates. */
function zodForField(field: TemplateField): z.ZodTypeAny {
  let schema: z.ZodTypeAny

  switch (field.type) {
    case 'text':
    case 'longtext':
      schema = z.string()
      if (!field.required) schema = (schema as z.ZodString).default('')
      return field.required ? schema : schema
    case 'date':
      schema = z.string() // ISO date string, kept loose since LLMs vary formatting
      return field.required ? schema : schema.optional().nullable().default(null)
    case 'number':
      schema = z.number()
      return field.required ? schema : schema.optional().nullable().default(null)
    case 'select': {
      const opts = field.options && field.options.length > 0 ? field.options : undefined
      schema = opts ? z.enum(opts as [string, ...string[]]) : z.string()
      return field.required ? schema : schema.optional().nullable().default(null)
    }
    case 'tags':
    case 'list':
      schema = z.array(z.string()).default([])
      return schema
    case 'checklist':
      schema = z.array(ChecklistItemSchema).default([])
      return schema
    default:
      schema = z.string().default('')
      return schema
  }
}

/** Builds a Zod object schema from a template's field definitions, plus a
 *  passthrough `fallback_unstructured` flag used by the unstructured-fallback path. */
export function buildTemplateSchema(fields: TemplateField[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of fields) {
    shape[field.key] = zodForField(field)
  }
  shape.fallback_unstructured = z.boolean().optional()
  return z.object(shape)
}

function describeFieldType(field: TemplateField): string {
  switch (field.type) {
    case 'text':
      return 'a short single-line string'
    case 'longtext':
      return 'a longer free-text string (a paragraph or more)'
    case 'checklist':
      return 'an array of objects: [{ "item": "task text", "done": false }]'
    case 'tags':
      return 'an array of short strings (e.g. names or keywords)'
    case 'list':
      return 'an array of short strings, one per bullet/point'
    case 'date':
      return 'a date string in YYYY-MM-DD format, or null if unknown'
    case 'number':
      return 'a number, or null if unknown'
    case 'select':
      return field.options?.length
        ? `one of: ${field.options.map((o) => `"${o}"`).join(', ')}`
        : 'a short string'
    default:
      return 'a string'
  }
}

function exampleValueForField(field: TemplateField): string {
  switch (field.type) {
    case 'checklist':
      return '[{ "item": "Example task", "done": false }]'
    case 'tags':
    case 'list':
      return '["Example 1", "Example 2"]'
    case 'date':
      return '"YYYY-MM-DD" or null'
    case 'number':
      return '0 or null'
    case 'select':
      return field.options?.length ? `"${field.options[0]}"` : '"value"'
    default:
      return '"..."'
  }
}

/** Builds the restructuring prompt for an arbitrary template, following the
 *  same tone/structure as the original hardcoded meeting-minutes prompt. */
export function buildTemplatePrompt(template: TemplateLike, rawText: string): string {
  const sortedFields = [...template.fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const schemaInstructions = sortedFields
    .map((f) => `  "${f.key}": ${describeFieldType(f)}${f.required ? ' (REQUIRED)' : ''} — "${f.label}"`)
    .join('\n')

  const exampleJson = `{\n${sortedFields
    .map((f) => `  "${f.key}": ${exampleValueForField(f)}`)
    .join(',\n')}\n}`

  return `You are an expert AI note restructurer. Parse the following raw transcript or unformatted notes into structured JSON conforming EXACTLY to the "${template.name}" template schema.

SCHEMA INSTRUCTIONS:
Return a valid JSON object with these fields:
${schemaInstructions}

EXAMPLE SHAPE (values are placeholders, use real content extracted from the raw notes):
${exampleJson}

CRITICAL RULES:
- Output ONLY valid JSON (no markdown triple backticks, no extra text).
- Fill every field as best you can from the raw content; leave arrays empty ([]) or strings empty ("") rather than omitting fields.
- Follow each field's type exactly as described above.

RAW NOTE CONTENT:
${rawText}`
}

export function buildRepairPrompt(rawText: string, invalidJson: string, validationError: string): string {
  return `Your previous JSON output failed schema validation.

VALIDATION ERRORS:
${validationError}

PREVIOUS INVALID OUTPUT:
${invalidJson}

ORIGINAL RAW NOTE:
${rawText}

Please fix the errors and output ONLY valid JSON matching the schema.`
}

export function templatePromptVersion(templateId: string): string {
  return `v1.0-dynamic-${templateId}`
}
