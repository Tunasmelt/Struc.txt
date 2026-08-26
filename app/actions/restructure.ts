'use server'

import { createClient } from '@/lib/supabase/server'
import { restructureNoteContent } from '@/lib/ai/restructure'
import { revalidatePath } from 'next/cache'

export async function restructureNoteAction(noteId: string, rawText: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Execute restructuring pipeline
  const result = await restructureNoteContent(rawText)

  // Insert into note_versions
  const { data, error } = await supabase
    .from('note_versions')
    .insert({
      note_id: noteId,
      body: result.body,
      model_used: result.model_used,
      prompt_version: result.prompt_version,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to insert note_version:', error)
    throw new Error(`Failed to save structured note version: ${error.message}`)
  }

  revalidatePath('/')
  return data
}
