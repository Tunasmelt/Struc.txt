'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createNote(rawText: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Extract title from first line or use default
  const title = rawText.split('\n')[0].substring(0, 100) || null

  const { data, error } = await supabase
    .from('notes')
    .insert({
      title,
      raw_text: rawText,
      note_date: new Date().toISOString().split('T')[0],
      transcript_source: 'manual',
      position: { x: 0, y: 0, rotation: 0, z_index: 0 },
      search: rawText, // Will be updated by trigger
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase error:', error)
    throw new Error(`Failed to create note: ${error.message}`)
  }

  revalidatePath('/')
  return data
}

export async function getNotes() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return [] // Return empty array if not authenticated
  }

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase error:', error)
    throw new Error(`Failed to fetch notes: ${error.message}`)
  }

  return data || []
}