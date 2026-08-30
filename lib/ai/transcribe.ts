import Groq, { toFile } from 'groq-sdk'

/** Sends a recorded audio buffer to Groq's Whisper endpoint and returns the
 *  cleaned-up transcript text. Used as the async cleanup pass after a live
 *  (Web Speech) transcript, per Phase 6 — Whisper is the source of truth,
 *  the live transcript is only a placeholder shown while recording. */
export async function transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set')
  }

  const groq = new Groq({ apiKey })
  const file = await toFile(buffer, filename)

  const response = await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3-turbo',
    response_format: 'json',
  })

  const text = response.text?.trim()
  if (!text) {
    throw new Error('Empty transcript from Whisper')
  }

  return text
}
