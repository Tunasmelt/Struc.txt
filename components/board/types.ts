import { TemplateType } from '@/lib/tokens'

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
  position: NotePosition
  template_id: string | null
  created_at: string
  updated_at: string
  note_versions?: NoteVersion[]
}

/** A note enriched with the info the board needs to render a card: the
 *  latest structured version (if restructuring has completed), a resolved
 *  width, and a template key used purely for the pin colour + label since
 *  `templates` rows aren't joined into getNotes() yet. */
export interface BoardNote extends RawNote {
  tmpl: TemplateType | null
  latestVersion: NoteVersion | null
}

export function enrichNote(note: RawNote): BoardNote {
  const versions = note.note_versions || []
  const latestVersion = versions.length
    ? versions.reduce((a, b) => (a.created_at > b.created_at ? a : b))
    : null
  // The restructuring pipeline only produces "meeting minutes" shaped bodies
  // right now (lib/prompts/meetingMinutes.ts) — templates aren't joined into
  // getNotes() yet, so this is the best signal available for the pin colour.
  const tmpl: TemplateType | null = latestVersion ? 'meeting' : null
  return {
    ...note,
    tmpl,
    latestVersion
  }
}
