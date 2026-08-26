'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { restructureNoteAction } from './restructure'

export async function createNote(rawText: string) {
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
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase insert note error:', error)
    throw new Error(`Failed to create note: ${error.message}`)
  }

  // Trigger restructuring as a background task (non-blocking per Phase 2 spec §4.4)
  restructureNoteAction(data.id, rawText).catch((err) => {
    console.error(`Background restructuring failed for note ${data.id}:`, err)
  })

  revalidatePath('/')
  return data
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