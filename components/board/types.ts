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
  restructure_pending: boolean
  position: NotePosition
  template_id: string | null
  pinned: boolean
  archived: boolean
  created_at: string
  updated_at: string
  note_versions?: NoteVersion[]
  note_tags?: NoteTagRow[]
  action_items?: ActionItemRow[]
}

/** A row from `note_tags` joined to its `tags` name — `status` is
 *  'suggested' (enrichment just proposed it) or 'confirmed' (the user acted
 *  on it); there's no 'rejected' state, rejecting a suggestion deletes the
 *  row outright (see rejectTag in app/actions/enrich.ts). */
export interface NoteTagRow {
  id: string
  status: string
  tags: { id: string; name: string } | null
}

/** A row from the real, cross-note `action_items` table — Phase 7's
 *  enrichment output. Distinct from a template's own `checklist`-typed
 *  field (see ChecklistItem/checklistFor below): that's pass-1 structured
 *  content a template happens to produce, this is pass-2 extraction that
 *  exists regardless of which template a note used. */
export interface ActionItemRow {
  id: string
  text: string
  due_date: string | null
  status: string
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

/** Tag names for filtering/display: merges whatever a `tags`-typed template
 *  field produced (pass-1 structured content) with the note's real
 *  *confirmed* tags from Phase 7's enrichment pass. Suggested-but-unconfirmed
 *  tags are deliberately excluded here — see suggestedNoteTags below for
 *  those, since they need their own confirm/reject UI, not silent inclusion
 *  in filters. */
export function tagsFor(note: BoardNote): string[] {
  const field = note.tmpl?.fields.find((f) => f.type === 'tags')
  const fromField = field && Array.isArray(note.latestVersion?.body?.[field.key])
    ? (note.latestVersion!.body[field.key] as unknown[]).map(String)
    : []
  return Array.from(new Set([...fromField, ...confirmedTagNames(note)]))
}

/** This note's confirmed tag names (Phase 7). */
export function confirmedTagNames(note: BoardNote): string[] {
  return (note.note_tags || [])
    .filter((t) => t.status === 'confirmed' && t.tags)
    .map((t) => t.tags!.name)
}

/** This note's suggested-but-not-yet-confirmed tags (Phase 7) — rendered
 *  distinctly from confirmed ones until the user confirms or rejects each. */
export function suggestedNoteTags(note: BoardNote): NoteTagRow[] {
  return (note.note_tags || []).filter((t) => t.status === 'suggested' && t.tags)
}

/** Open (not-done) real action items from Phase 7's enrichment pass —
 *  the cross-note-syncable kind, not a template's own checklist field. */
export function openActionItemRows(note: BoardNote): ActionItemRow[] {
  return (note.action_items || []).filter((a) => a.status !== 'done')
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
