'use server'

import { createClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/ai/transcribe'
import { restructureNoteAction } from './restructure'

const AUDIO_BUCKET = 'audio-captures'

/** Creates a note from a just-finished recording. `storagePath` must already
 *  exist in the private `audio-captures` bucket (uploaded client-side, since
 *  the browser has direct mic/MediaRecorder access this server action
 *  doesn't). `liveTranscript` is whatever the Web Speech API produced during
 *  recording, if the browser supports it — shown immediately as a
 *  placeholder while the Whisper cleanup pass runs in the background. */
export async function createAudioNote(
  storagePath: string,
  liveTranscript: string,
  templateId?: string | null,
  titleOverride?: string | null,
  skipRestructure?: boolean
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const placeholderText = liveTranscript.trim() || '(audio capture — transcript pending)'
  const trimmedOverride = titleOverride?.trim()
  const firstLine = liveTranscript.trim().split('\n')[0] || ''
  const title = trimmedOverride || firstLine.substring(0, 100) || 'Untitled capture'

  const { data, error } = await supabase
    .from('notes')
    .insert({
      title,
      raw_text: placeholderText,
      note_date: new Date().toISOString().split('T')[0],
      transcript_source: 'whisper',
      audio_path: storagePath,
      position: { x: 0, y: 0, rotation: 0, z_index: 0 },
      search: placeholderText,
      user_id: user.id,
      template_id: templateId ?? null,
      restructure_pending: !skipRestructure,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase insert audio note error:', error)
    throw new Error(`Failed to create note: ${error.message}`)
  }

  // Whisper cleanup always runs — that's just turning audio into clean
  // text, independent of whether AI restructuring happens afterward.
  // Restructuring itself is skippable, same as paste capture's "Save"
  // vs "Restructure instead".
  transcribeAndRestructure(data.id, storagePath, templateId ?? null, !!skipRestructure).catch((err) => {
    console.error(`Background transcription failed for note ${data.id}:`, err)
  })

  return data
}

async function transcribeAndRestructure(noteId: string, storagePath: string, templateId: string | null, skipRestructure: boolean) {
  const supabase = await createClient()

  let transcript: string | null = null
  try {
    const { data: blob, error: downloadError } = await supabase.storage.from(AUDIO_BUCKET).download(storagePath)
    if (downloadError || !blob) {
      throw new Error(downloadError?.message || 'Audio file not found in storage')
    }
    const buffer = Buffer.from(await blob.arrayBuffer())
    transcript = await transcribeAudio(buffer, storagePath.split('/').pop() || 'recording.webm')
  } catch (err) {
    console.error(`Whisper transcription failed for note ${noteId}, falling back to live transcript:`, err)
  }

  // On Whisper failure, restructuring still runs against whatever raw_text
  // the note already has (the live transcript or placeholder) rather than
  // leaving the note stuck — graceful degradation per the exit gate's
  // "recording still completes" requirement, just without the Whisper
  // quality improvement.
  let finalText = transcript
  if (transcript) {
    const { error: updateError } = await supabase
      .from('notes')
      .update({ raw_text: transcript })
      .eq('id', noteId)
    if (updateError) {
      console.error(`Failed to save Whisper transcript for note ${noteId}:`, updateError)
    }
  } else {
    const { data: existing } = await supabase.from('notes').select('raw_text').eq('id', noteId).single()
    finalText = existing?.raw_text || '(audio capture — transcript unavailable)'
  }

  if (!skipRestructure) {
    await restructureNoteAction(noteId, finalText!, templateId)
  }
}

/** Signed URL for playing back a note's recording — never a public path,
 *  scoped to the owning user via the storage RLS policies in
 *  007_audio_storage_bucket.sql. Expires in an hour. */
export async function getAudioSignedUrl(noteId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: note, error: noteError } = await supabase
    .from('notes')
    .select('audio_path')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .single()

  if (noteError || !note?.audio_path) return null

  const { data, error } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(note.audio_path, 3600)
  if (error) {
    console.error('Failed to create signed audio URL:', error)
    return null
  }
  return data.signedUrl
}
