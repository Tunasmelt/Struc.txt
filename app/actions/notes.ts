'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { restructureNoteAction } from './restructure'

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

  revalidatePath('/')
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
  revalidatePath('/')
  return version
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
    .select('*, note_versions(*)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase fetch notes error:', error)
    throw new Error(`Failed to fetch notes: ${error.message}`)
  }

  return data || []
}