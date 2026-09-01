/** Guest mode's entire data layer. Everything here lives ONLY in this
 *  browser's IndexedDB — none of it ever touches Supabase, so there's no
 *  server round-trip and nothing to reconcile. That's also what fixes "note
 *  positions reset on refresh" for guests: previously a guest had no
 *  persistence at all (every mutation ultimately called a Server Action that
 *  throws 'User not authenticated'), so nothing ever survived a reload. Here
 *  every mutation writes straight to IndexedDB before returning, so a reload
 *  reads back exactly what was last set.
 *
 *  This module intentionally mirrors the exported function signatures of
 *  app/actions/notes.ts / app/actions/enrich.ts so app/board/page.tsx can
 *  swap between "real" and "guest" implementations with the same call sites
 *  (see notesApi in app/board/page.tsx) rather than forking every handler.
 *
 *  Deliberately NOT supported in guest mode (both because they require a
 *  server call and because a truly local guest has no natural place for the
 *  server-only bits — an API key, a storage bucket — to live):
 *   - AI restructuring/enrichment (createNote always saves as-is; the
 *     drawer's manual field editor — saveEditedNoteVersion — still works,
 *     since that's pure local data entry, no LLM call)
 *   - Audio recording (needs Supabase Storage)
 *   - Tag suggestions / action-item extraction (both are enrichment output) */

import type { RawNote, NoteVersion, NotePosition } from '@/components/board/types'
import type { TemplateRow } from '@/app/actions/templates'

const DB_NAME = 'noteflow-guest'
const DB_VERSION = 1
const STORE = 'notes'

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return Promise.resolve(null)
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

async function getAll(): Promise<RawNote[]> {
  const db = await openDb()
  if (!db) return []
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as RawNote[]) || [])
    req.onerror = () => resolve([])
  })
}

async function put(note: RawNote): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(note)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

async function remove(id: string): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

async function getOne(id: string): Promise<RawNote | undefined> {
  const db = await openDb()
  if (!db) return undefined
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as RawNote | undefined)
    req.onerror = () => resolve(undefined)
  })
}

export async function getNotes(): Promise<RawNote[]> {
  return getAll()
}

export async function createNote(
  rawText: string,
  templateId?: string | null,
  titleOverride?: string | null
): Promise<RawNote> {
  const trimmedOverride = titleOverride?.trim()
  const firstLine = rawText.trim().split('\n')[0] || ''
  const title = trimmedOverride || firstLine.substring(0, 100) || 'Untitled Note'
  const now = new Date().toISOString()

  const note: RawNote = {
    id: uuid(),
    title,
    note_date: now.split('T')[0],
    raw_text: rawText,
    audio_path: null,
    transcript_source: 'typed',
    restructure_pending: false,
    position: { x: 0, y: 0, rotation: 0, z_index: 0 },
    template_id: templateId ?? null,
    pinned: false,
    archived: false,
    created_at: now,
    updated_at: now,
    note_versions: [],
    note_tags: [],
    action_items: [],
  }
  await put(note)
  return note
}

export async function updateNoteFlags(noteId: string, patch: { pinned?: boolean; archived?: boolean }): Promise<void> {
  const note = await getOne(noteId)
  if (!note) return
  await put({ ...note, ...patch, updated_at: new Date().toISOString() })
}

export async function updateNoteTitle(noteId: string, title: string): Promise<void> {
  const note = await getOne(noteId)
  if (!note) return
  const trimmed = title.trim().substring(0, 100)
  await put({ ...note, title: trimmed || 'Untitled capture', updated_at: new Date().toISOString() })
}

export async function updateNoteRawText(noteId: string, rawText: string): Promise<void> {
  const note = await getOne(noteId)
  if (!note) return
  await put({ ...note, raw_text: rawText, updated_at: new Date().toISOString() })
}

export async function saveEditedNoteVersion(
  noteId: string,
  templateId: string | null,
  body: Record<string, unknown>
): Promise<NoteVersion> {
  const note = await getOne(noteId)
  if (!note) throw new Error('Note not found')

  const version: NoteVersion = {
    id: uuid(),
    note_id: noteId,
    body,
    model_used: 'manual-edit',
    prompt_version: 'manual',
    template_id: templateId,
    created_at: new Date().toISOString(),
  }
  await put({
    ...note,
    template_id: templateId ?? note.template_id,
    note_versions: [...(note.note_versions || []), version],
    updated_at: version.created_at,
  })
  return version
}

export async function deleteNote(noteId: string): Promise<void> {
  await remove(noteId)
}

export async function duplicateNote(noteId: string): Promise<RawNote> {
  const source = await getOne(noteId)
  if (!source) throw new Error('Note not found')

  const now = new Date().toISOString()
  const copy: RawNote = {
    ...source,
    id: uuid(),
    title: source.title ? `${source.title} (copy)` : 'Untitled capture (copy)',
    position: { ...source.position, x: source.position.x + 18, y: source.position.y + 18 },
    pinned: false,
    archived: false,
    created_at: now,
    updated_at: now,
  }
  await put(copy)
  return copy
}

export async function updateNotePosition(noteId: string, position: NotePosition): Promise<void> {
  const note = await getOne(noteId)
  if (!note) return
  await put({ ...note, position, updated_at: new Date().toISOString() })
}

export async function searchNoteIds(query: string): Promise<string[]> {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []
  const notes = await getAll()
  return notes
    .filter((n) => (n.title || '').toLowerCase().includes(trimmed) || n.raw_text.toLowerCase().includes(trimmed))
    .map((n) => n.id)
}

/** No-ops: guest notes never get AI-suggested tags or extracted action
 *  items in the first place (both are enrichment output, which needs a
 *  server call this mode deliberately skips), so there's nothing to confirm,
 *  reject, or toggle. Kept as real async functions so callers in
 *  app/board/page.tsx don't need guest-mode branches of their own. */
export async function confirmTag(_id: string): Promise<void> {}
export async function rejectTag(_id: string): Promise<void> {}
export async function toggleActionItem(_id: string, _done: boolean): Promise<void> {}

/** Wipes every locally-stored guest note — call when a guest signs in/up for
 *  real (see app/board/page.tsx) so their scratch notes don't linger
 *  invisibly in IndexedDB forever, and never get confused with a signed-in
 *  account's own data. */
export async function clearGuestNotes(): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

/** The six spec presets (supabase/migrations/004_seed_preset_templates.sql),
 *  hardcoded here so guest mode never needs a DB read at all — not even a
 *  read-only one for shared, non-personal preset data. Keep this in sync
 *  with that migration if presets ever change. */
export const GUEST_TEMPLATES: TemplateRow[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Meeting minutes',
    icon_color: '#C08A2E',
    fields: [
      { key: 'summary', label: 'Summary', type: 'longtext', required: true, order: 0 },
      { key: 'attendees', label: 'Attendees', type: 'tags', required: false, order: 1 },
      { key: 'key_decisions', label: 'Decisions', type: 'list', required: false, order: 2 },
      { key: 'discussion_points', label: 'Discussion', type: 'longtext', required: false, order: 3 },
      { key: 'action_items', label: 'Action items', type: 'checklist', required: false, order: 4 },
    ],
    is_preset: true,
    user_id: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'SOAP note',
    icon_color: '#3F7F63',
    fields: [
      { key: 'subjective', label: 'Subjective', type: 'longtext', required: true, order: 0 },
      { key: 'objective', label: 'Objective', type: 'longtext', required: true, order: 1 },
      { key: 'assessment', label: 'Assessment', type: 'longtext', required: true, order: 2 },
      { key: 'plan', label: 'Plan', type: 'longtext', required: false, order: 3 },
    ],
    is_preset: true,
    user_id: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: '1:1 notes',
    icon_color: '#3A6699',
    fields: [
      { key: 'wins', label: 'Wins', type: 'longtext', required: false, order: 0 },
      { key: 'concerns', label: 'Concerns', type: 'longtext', required: false, order: 1 },
      { key: 'follow_ups', label: 'Follow-ups', type: 'checklist', required: false, order: 2 },
    ],
    is_preset: true,
    user_id: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'Journal entry',
    icon_color: '#B0574F',
    fields: [
      { key: 'mood', label: 'Mood', type: 'text', required: false, order: 0 },
      { key: 'entry', label: 'Entry', type: 'longtext', required: true, order: 1 },
    ],
    is_preset: true,
    user_id: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    name: 'Lecture notes',
    icon_color: '#69675E',
    fields: [
      { key: 'outline', label: 'Outline', type: 'list', required: false, order: 0 },
      { key: 'exam_note', label: 'Exam note', type: 'longtext', required: false, order: 1 },
    ],
    is_preset: true,
    user_id: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    name: 'Interview notes',
    icon_color: '#67589F',
    fields: [
      { key: 'context', label: 'Context', type: 'longtext', required: false, order: 0 },
      { key: 'pain', label: 'Pain', type: 'longtext', required: false, order: 1 },
      { key: 'quote', label: 'Quote', type: 'text', required: false, order: 2 },
    ],
    is_preset: true,
    user_id: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
]

export async function getTemplates(): Promise<TemplateRow[]> {
  return GUEST_TEMPLATES
}
