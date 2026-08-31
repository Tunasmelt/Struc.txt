'use server'

import { createClient } from '@/lib/supabase/server'
import { enrichNoteContent } from '@/lib/ai/enrich'

// No revalidatePath() in this file: enrichNoteAction runs detached
// (fire-and-forget from restructureNoteAction) and calling it from that
// context after the originating request completed throws "used during
// render... unsupported". The others don't need it either — the board is
// a 'use client' page that re-fetches its own data directly.

/** Pass 2. Called fire-and-forget after a note_versions row lands
 *  (see restructureNoteAction) — any failure here is caught and logged,
 *  never thrown to the caller, so it can never affect the note or its
 *  already-saved structured content from pass 1. */
export async function enrichNoteAction(noteId: string, structuredBody: Record<string, unknown>) {
  try {
    const result = await enrichNoteContent(structuredBody)
    const supabase = await createClient()

    for (const rawTag of result.tags) {
      const name = rawTag.trim().toLowerCase()
      if (!name) continue

      const { data: tagRow, error: tagError } = await supabase
        .from('tags')
        .upsert({ name }, { onConflict: 'name' })
        .select()
        .single()

      if (tagError || !tagRow) {
        console.error(`Enrichment: failed to upsert tag "${name}" for note ${noteId}:`, tagError)
        continue
      }

      // Suggested by default (note_tags.status defaults to 'suggested' per
      // 001_base_schema.sql); ignoreDuplicates so re-enriching a note never
      // resets an already-confirmed tag back to suggested.
      const { error: linkError } = await supabase
        .from('note_tags')
        .upsert({ note_id: noteId, tag_id: tagRow.id }, { onConflict: 'note_id,tag_id', ignoreDuplicates: true })

      if (linkError) {
        console.error(`Enrichment: failed to link tag "${name}" to note ${noteId}:`, linkError)
      }
    }

    if (result.action_items.length) {
      const { error: actionsError } = await supabase.from('action_items').insert(
        result.action_items.map((a) => ({
          note_id: noteId,
          text: a.text,
          due_date: a.due_date,
          status: 'pending',
          source: 'enrichment',
        }))
      )
      if (actionsError) {
        console.error(`Enrichment: failed to insert action items for note ${noteId}:`, actionsError)
      }
    }
  } catch (err) {
    console.error(`Enrichment failed for note ${noteId} — pass 1's structured content is unaffected:`, err)
  }
}

export async function confirmTag(noteTagId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('note_tags').update({ status: 'confirmed' }).eq('id', noteTagId)
  if (error) {
    console.error('Failed to confirm tag:', error)
    throw new Error(`Failed to confirm tag: ${error.message}`)
  }
}

export async function rejectTag(noteTagId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('note_tags').delete().eq('id', noteTagId)
  if (error) {
    console.error('Failed to reject tag:', error)
    throw new Error(`Failed to reject tag: ${error.message}`)
  }
}

export async function toggleActionItem(actionItemId: string, done: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('action_items')
    .update({ status: done ? 'done' : 'pending' })
    .eq('id', actionItemId)
  if (error) {
    console.error('Failed to update action item:', error)
    throw new Error(`Failed to update action item: ${error.message}`)
  }
}
