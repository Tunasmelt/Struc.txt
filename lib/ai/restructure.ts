import {
  MeetingMinutesSchema,
  PROMPT_VERSION_MEETING_MINUTES,
  getMeetingMinutesPrompt,
  getRepairPrompt,
} from '../prompts/meetingMinutes'
import {
  buildTemplateSchema,
  buildTemplatePrompt,
  buildRepairPrompt,
  templatePromptVersion,
  TemplateField,
  TemplateLike,
} from '../prompts/dynamicTemplate'
import { generateWithGemini, generateWithGroq, LLMResult } from './providers'
import { z } from 'zod'

export interface RestructureResult {
  body: Record<string, unknown>
  model_used: string
  prompt_version: string
}

/**
 * Executes LLM call with Gemini primary, Groq fallback, and Zod repair retry.
 *
 * When `template` is omitted, this falls back to the original Phase 2
 * hardcoded Meeting Minutes schema/prompt for backward compatibility. When a
 * template is supplied, the Zod schema and the restructuring prompt are both
 * generated dynamically from that template's `fields` definition.
 */
export async function restructureNoteContent(
  rawText: string,
  template?: TemplateLike
): Promise<RestructureResult> {
  const schema = template ? buildTemplateSchema(template.fields) : MeetingMinutesSchema
  const prompt = template ? buildTemplatePrompt(template, rawText) : getMeetingMinutesPrompt(rawText)
  const promptVersion = template ? templatePromptVersion(template.id) : PROMPT_VERSION_MEETING_MINUTES

  let llmResult: LLMResult | null = null
  let providerUsed: 'gemini' | 'groq' = 'gemini'

  // Attempt Primary: Gemini
  try {
    llmResult = await generateWithGemini(prompt)
  } catch (err: unknown) {
    console.warn('Gemini failed or rate-limited, attempting Groq fallback:', (err as Error)?.message || err)
    providerUsed = 'groq'
    try {
      llmResult = await generateWithGroq(prompt)
    } catch (groqErr: unknown) {
      console.error('Groq fallback also failed:', (groqErr as Error)?.message || groqErr)
    }
  }

  // If both providers failed or threw errors (e.g., missing keys in dev environment)
  if (!llmResult) {
    return createUnstructuredFallback(rawText, 'fallback/no-provider-response', template, promptVersion)
  }

  // First Validation Pass
  const firstParse = tryParseAndValidate(llmResult.text, schema)
  if (firstParse.success) {
    return {
      body: firstParse.data as Record<string, unknown>,
      model_used: llmResult.model,
      prompt_version: promptVersion,
    }
  }

  // Repair Retry Pass
  console.warn('Zod validation failed on initial LLM output. Executing 1 repair retry...')
  const repairPrompt = template
    ? buildRepairPrompt(rawText, llmResult.text, firstParse.error)
    : getRepairPrompt(rawText, llmResult.text, firstParse.error)
  let repairResult: LLMResult | null = null

  try {
    if (providerUsed === 'gemini') {
      repairResult = await generateWithGemini(repairPrompt)
    } else {
      repairResult = await generateWithGroq(repairPrompt)
    }
  } catch (repairErr: unknown) {
    console.warn('Repair retry call failed:', (repairErr as Error)?.message || repairErr)
  }

  if (repairResult) {
    const secondParse = tryParseAndValidate(repairResult.text, schema)
    if (secondParse.success) {
      return {
        body: secondParse.data as Record<string, unknown>,
        model_used: `${repairResult.model}-repaired`,
        prompt_version: promptVersion,
      }
    }
  }

  // Unstructured fallback after failed repair retry
  console.warn('Repair retry also failed validation. Storing unstructured fallback.')
  return createUnstructuredFallback(
    rawText,
    `${llmResult.model}-unstructured-fallback`,
    template,
    promptVersion
  )
}

function tryParseAndValidate(
  jsonText: string,
  schema: z.ZodTypeAny
): { success: true; data: unknown } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(jsonText)
    const validation = schema.safeParse(parsed)
    if (validation.success) {
      return { success: true, data: validation.data }
    } else {
      return { success: false, error: validation.error.format ? JSON.stringify(validation.error.format()) : validation.error.message }
    }
  } catch (err: unknown) {
    return { success: false, error: `Invalid JSON syntax: ${(err as Error)?.message || String(err)}` }
  }
}

function defaultValueForFallback(field: TemplateField): unknown {
  switch (field.type) {
    case 'checklist':
    case 'tags':
    case 'list':
      return []
    case 'number':
      return null
    case 'date':
    case 'select':
      return null
    default:
      return ''
  }
}

function createUnstructuredFallback(
  rawText: string,
  modelLabel: string,
  template: TemplateLike | undefined,
  promptVersion: string
): RestructureResult {
  const summary = rawText.length > 120 ? rawText.substring(0, 120) + '...' : rawText

  let fallbackBody: Record<string, unknown>

  if (template) {
    fallbackBody = {}
    for (const field of template.fields) {
      fallbackBody[field.key] = defaultValueForFallback(field)
    }
    // Prefer to surface the raw text in whichever field looks like the main body.
    const primaryTextField = template.fields.find((f) => f.type === 'longtext') || template.fields[0]
    if (primaryTextField) {
      fallbackBody[primaryTextField.key] = rawText
    }
    fallbackBody.fallback_unstructured = true
  } else {
    fallbackBody = {
      summary: summary || 'Unstructured note capture',
      attendees: [],
      key_decisions: [],
      discussion_points: [
        {
          topic: 'Raw Note Content',
          details: rawText,
        },
      ],
      action_items: [],
      fallback_unstructured: true,
    }
  }

  return {
    body: fallbackBody,
    model_used: modelLabel,
    prompt_version: promptVersion,
  }
}
