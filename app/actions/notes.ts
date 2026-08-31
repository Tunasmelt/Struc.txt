'use server'

import { createClient } from '@/lib/supabase/server'
import { restructureNoteAction } from './restructure'

// Note: no revalidatePath() anywhere in this file. Every page that reads
// this data is a 'use client' component fetching directly via these server
// actions (see loadNotes() in app/board/page.tsx) rather than relying on
// Next's router/page cache, so revalidatePath is never load-bearing here —
// and calling it from a detached background task (restructureNoteAction is
// fire-and-forget from createNote/duplicateNote) throws "used during
// render... unsupported" once the originating request has already
// completed. Real bug this project shipped with; removed rather than
// worked around.

export async function createNote(rawText: string, templateId?: string | null) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Extract title from first line or default
  const firstLine = rawText.trim().split('\n')[0] || ''
  const title = firstLine.substring(0, 100) || 'Untitled Note'

  const { data, error } = await supabase
    .from('notes')
    .insert({
      title,
      raw_text: rawText,
      note_date: new Date().toISOString().split('T')[0],
      transcript_source: 'typed',
      position: { x: 0, y: 0, rotation: 0, z_index: 0 },
      search: rawText,
      user_id: user.id,
      template_id: templateId ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase insert note error:', error)
    throw new Error(`Failed to create note: ${error.message}`)
  }

  // Trigger restructuring as a background task (non-blocking per Phase 2 spec §4.4).
  // If no template was chosen, this falls back to the Meeting Minutes preset
  // (see restructureNoteAction) to preserve Phase 1/2's always-restructure behavior.
  restructureNoteAction(data.id, rawText, templateId ?? null).catch((err) => {
    console.error(`Background restructuring failed for note ${data.id}:`, err)
  })

  return data
}

/** Applies (or re-applies) a template to an already-captured note and
 *  triggers a fresh restructuring pass against that template — used by the
 *  "pick/re-pick a template after capture" affordance on the board. */
export async function applyTemplateToNote(noteId: string, templateId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: note, error: fetchError } = await supabase
    .from('notes')
    .select('id, raw_text')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !note) {
    console.error('Supabase fetch note for template apply error:', fetchError)
    throw new Error(`Failed to load note: ${fetchError?.message || 'not found'}`)
  }

  const { error: updateError } = await supabase
    .from('notes')
    .update({ template_id: templateId })
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (updateError) {
    console.error('Supabase update note template error:', updateError)
    throw new Error(`Failed to set note template: ${updateError.message}`)
  }

  const version = await restructureNoteAction(noteId, note.raw_text, templateId)
  return version
}

/** Toggles pinned/archived — real DB columns (migration 005) since these
 *  must survive a reload, unlike collapsed/width which stay UI-local.
 *
 *  No .select().single() here: the caller doesn't use a returned row, and
 *  requesting one meant Supabase's PostgREST layer required exactly one row
 *  to come back or throw PGRST116 ("cannot coerce to a single object") —
 *  which fired for real whenever a stale in-flight request landed after the
 *  note had already been deleted (e.g. a rapid pin-then-delete). A plain
 *  update with no .select() just no-ops on zero matching rows instead of
 *  crashing the request with a 500. */
export async function updateNoteFlags(noteId: string, patch: { pinned?: boolean; archived?: boolean }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('notes')
    .update(patch)
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Supabase update note flags error:', error)
    throw new Error(`Failed to update note: ${error.message}`)
  }
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('user_id', user.id)

  if (error) {
    console.error('Supabase delete note error:', error)
    throw new Error(`Failed to delete note: ${error.message}`)
  }
}

/** Clones a note (title + raw text + template) as a brand-new row with its
 *  own version history — restructures fresh rather than copying versions,
 *  so the duplicate's structured body is never mistaken for a live copy of
 *  the original's note_versions rows. */
export async function duplicateNote(noteId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: source, error: fetchError } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !source) {
    throw new Error(`Failed to load note to duplicate: ${fetchError?.message || 'not found'}`)
  }

  const position = { ...source.position, x: (source.position?.x ?? 0) + 18, y: (source.position?.y ?? 0) + 18 }

  const { data: copy, error: insertError } = await supabase
    .from('notes')
    .insert({
      title: source.title ? `${source.title} (copy)` : 'Untitled capture (copy)',
      raw_text: source.raw_text,
      note_date: source.note_date,
      transcript_source: source.transcript_source,
      position,
      search: source.raw_text,
      user_id: user.id,
      template_id: source.template_id,
      pinned: false,
      archived: false,
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(`Failed to duplicate note: ${insertError.message}`)
  }

  restructureNoteAction(copy.id, source.raw_text, source.template_id ?? null).catch((err) => {
    console.error(`Background restructuring failed for duplicated note ${copy.id}:`, err)
  })

  return copy
}

export async function updateNotePosition(
  noteId: string,
  position: { x: number; y: number; rotation: number; z_index: number }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('notes')
    .update({ position })
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Supabase update note position error:', error)
    throw new Error(`Failed to update note position: ${error.message}`)
  }
}

export async function getNotes() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('notes')
    .select('*, note_versions(*), note_tags(id, status, tags(id, name)), action_items(id, text, due_date, status)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase fetch notes error:', error)
    throw new Error(`Failed to fetch notes: ${error.message}`)
  }

  return data || []
}

/** Real Postgres full-text search against notes.search (a plain TEXT column
 *  with a `gin(to_tsvector('english', search))` expression index — see
 *  001_base_schema.sql). PostgREST's `textSearch` filter applies
 *  `to_tsvector('english', search) @@ websearch_to_tsquery('english', query)`
 *  server-side, which the index covers. Returns matching note ids only; the
 *  caller intersects this with whatever notes it already has loaded rather
 *  than replacing the load path, since the board needs the full note set
 *  for drag/pin/stack regardless of the active search query. */
export async function searchNoteIds(query: string): Promise<string[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notes')
    .select('id')
    .textSearch('search', trimmed, { type: 'websearch', config: 'english' })

  if (error) {
    console.error('Supabase full-text search error:', error)
    return []
  }

  return (data || []).map((row) => row.id as string)
}