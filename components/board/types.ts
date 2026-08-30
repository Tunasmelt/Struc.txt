import { DEFAULT_TEMPLATE_PIN } from '@/lib/tokens'
import { TemplateField } from '@/lib/prompts/dynamicTemplate'
import { TemplateRow } from '@/app/actions/templates'

export interface NoteVersion {
  id: string
  note_id: string
  body: Record<string, unknown>
  model_used: string | null
  prompt_version: string | null
  template_id?: string | null
  created_at: string
}

export interface NotePosition {
  x: number
  y: number
  rotation: number
  z_index: number
}

export interface RawNote {
  id: string
  title: string | null
  note_date: string | null
  raw_text: string
  audio_path: string | null
  transcript_source: string | null
  position: NotePosition
  template_id: string | null
  pinned: boolean
  archived: boolean
  created_at: string
  updated_at: string
  note_versions?: NoteVersion[]
}

/** A resolved template shape used purely for board rendering: name, pin
 *  colour and field list, regardless of whether it's a preset or a
 *  user-created custom template. */
export interface ResolvedTemplate {
  id: string
  name: string
  pin: string
  fields: TemplateField[]
}

/** A note enriched with the info the board needs to render a card: the
 *  latest structured version (if restructuring has completed) and the
 *  resolved template (looked up from the `templates` table by id). */
export interface BoardNote extends RawNote {
  tmpl: ResolvedTemplate | null
  latestVersion: NoteVersion | null
}

export function toResolvedTemplate(row: TemplateRow): ResolvedTemplate {
  return {
    id: row.id,
    name: row.name,
    pin: row.icon_color || DEFAULT_TEMPLATE_PIN,
    fields: row.fields || [],
  }
}

/** First `tags`-typed field's value on a note's template, if any — the
 *  board has no separate tags table yet (see report), so tag chips/filters
 *  are derived from whatever the dynamic template produced. */
export function tagsFor(note: BoardNote): string[] {
  const field = note.tmpl?.fields.find((f) => f.type === 'tags')
  if (!field) return []
  const value = note.latestVersion?.body?.[field.key]
  return Array.isArray(value) ? value.map(String) : []
}

export interface ChecklistItem {
  item: string
  done?: boolean
  due?: string
}

/** First `checklist`-typed field's value — used as the note's "action items". */
export function checklistFor(note: BoardNote): ChecklistItem[] {
  const field = note.tmpl?.fields.find((f) => f.type === 'checklist')
  if (!field) return []
  const value = note.latestVersion?.body?.[field.key]
  return Array.isArray(value) ? (value as ChecklistItem[]) : []
}

export function enrichNote(note: RawNote, templatesById: Record<string, ResolvedTemplate>): BoardNote {
  const versions = note.note_versions || []
  const latestVersion = versions.length
    ? versions.reduce((a, b) => (a.created_at > b.created_at ? a : b))
    : null

  const templateId = note.template_id ?? latestVersion?.template_id ?? null
  const tmpl = templateId ? templatesById[templateId] ?? null : null

  return {
    ...note,
    tmpl,
    latestVersion,
  }
}
