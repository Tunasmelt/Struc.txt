'use client'

import { useEffect, useRef, useState } from 'react'
import { createNote } from '@/app/actions/notes'
import { createAudioNote } from '@/app/actions/audio'
import { createClient } from '@/lib/supabase/client'
import { ResolvedTemplate } from './types'

interface CaptureModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  templates: ResolvedTemplate[]
}

type CaptureMode = 'record' | 'paste'

const BAR_COUNT = 18

/** Minimal shape of the Web Speech API's SpeechRecognition — not in
 *  lib.dom.d.ts, and only webkit-prefixed in Chrome/Edge. Firefox/Safari
 *  have no implementation at all, which is exactly the case Phase 6's exit
 *  gate requires degrading gracefully from (recording still works, the
 *  transcript just arrives later via Whisper only). */
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

function pickAudioMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c
  }
  return ''
}

export default function CaptureModal({ open, onClose, onCreated, templates }: CaptureModalProps) {
  const [mode, setMode] = useState<CaptureMode>('paste')
  const [raw, setRaw] = useState('')
  const [title, setTitle] = useState('')
  const [templateId, setTemplateId] = useState<string>('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [recording, setRecording] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [levels, setLevels] = useState<number[]>(new Array(BAR_COUNT).fill(0.08))
  const [speechSupported, setSpeechSupported] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognitionCtor())
  }, [])

  // Declared before the `if (!open) return null` below on purpose: the
  // effect right after it must be able to call this on the render where
  // `open` flips to false, and that render exits at the early return before
  // ever reaching a declaration placed after it — referencing a
  // not-yet-initialized `const` in that render's closure throws
  // "Cannot access before initialization" (a real bug this project shipped
  // with, not a hypothetical).
  const stopRecording = (discard = false) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setLevels(new Array(BAR_COUNT).fill(0.08))

    recognitionRef.current?.stop()
    recognitionRef.current = null

    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    analyserRef.current = null

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    const recorder = recorderRef.current
    recorderRef.current = null
    setRecording(false)

    if (discard || !recorder) return
    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
      }
      recorder.stop()
    })
  }

  useEffect(() => {
    // Stop everything if the modal is closed mid-recording.
    if (!open) stopRecording(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const levelLoop = () => {
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const step = Math.floor(data.length / BAR_COUNT) || 1
    const next: number[] = []
    for (let i = 0; i < BAR_COUNT; i++) {
      const v = data[i * step] || 0
      next.push(Math.max(0.08, v / 255))
    }
    setLevels(next)
    rafRef.current = requestAnimationFrame(levelLoop)
  }

  const startRecording = async () => {
    setError(null)
    setLiveTranscript('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickAudioMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorderRef.current = recorder
      recorder.start()

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      rafRef.current = requestAnimationFrame(levelLoop)

      const RecognitionCtor = getSpeechRecognitionCtor()
      if (RecognitionCtor) {
        const recognition = new RecognitionCtor()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        let finalText = ''
        recognition.onresult = (event: any) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) finalText += result[0].transcript + ' '
            else interim += result[0].transcript
          }
          setLiveTranscript((finalText + interim).trim())
        }
        recognition.onerror = () => {
          // Non-fatal: recording continues, Whisper covers the transcript.
        }
        recognitionRef.current = recognition
        recognition.start()
      }

      setRecording(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access the microphone')
    }
  }

  const handleStopAndSave = async () => {
    const blob = await stopRecording(false)
    if (!blob || blob.size === 0) {
      setError('No audio was captured — try recording again.')
      return
    }
    setWorking(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const ext = (blob.type.split('/')[1] || 'webm').split(';')[0]
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('audio-captures')
        .upload(path, blob, { contentType: blob.type })
      if (uploadError) throw uploadError

      await createAudioNote(path, liveTranscript, templateId || null, title || null)
      setLiveTranscript('')
      setTitle('')
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recording')
    } finally {
      setWorking(false)
    }
  }

  const handleRestructure = async () => {
    if (!raw.trim() || working) return
    setWorking(true)
    setError(null)
    try {
      await createNote(raw, templateId || null, title || null)
      setRaw('')
      setTitle('')
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setWorking(false)
    }
  }

  const handleClose = () => {
    if (recording) stopRecording(true)
    onClose()
  }

  const tabStyle = (active: boolean) => ({
    border: '1px solid ' + (active ? 'var(--brass)' : 'var(--chrome-line)'),
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600 as const,
    background: active ? 'var(--brass)' : 'var(--chrome-2)',
    color: active ? 'var(--brass-ink)' : 'var(--chalk)'
  })

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-start justify-center overflow-auto p-6"
      style={{ background: 'rgba(8,7,6,.72)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="mt-[6vh] w-full rounded-xl"
        style={{ maxWidth: 620, background: 'var(--chrome-2)', border: '1px solid var(--chrome-line)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--chrome-line)' }}
        >
          <h2
            className="m-0 text-[19px] font-bold"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-.02em' }}
          >
            New capture
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="px-2 py-1 text-xl leading-none"
            style={{ color: 'var(--chalk-dim)' }}
          >
            ×
          </button>
        </header>

        <div className="p-5">
          <div role="group" aria-label="Capture method" className="mb-3.5 flex gap-1.5">
            <button onClick={() => setMode('record')} style={tabStyle(mode === 'record')}>
              Record
            </button>
            <button onClick={() => setMode('paste')} style={tabStyle(mode === 'paste')}>
              Paste
            </button>
          </div>

          <label
            className="mb-1.5 block text-[10.5px] uppercase"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '.08em', color: 'var(--muted)' }}
          >
            Title (optional — otherwise taken from the first line)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled capture"
            maxLength={100}
            className="mb-3 w-full rounded-[10px] p-[10px]"
            style={{
              background: 'var(--well)',
              border: '1px solid var(--chrome-line)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--chalk)'
            }}
          />

          <label
            className="mb-1.5 block text-[10.5px] uppercase"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '.08em', color: 'var(--muted)' }}
          >
            Template (optional — can be applied after capture too)
          </label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="mb-3 w-full rounded-[10px] p-[10px]"
            style={{
              background: 'var(--well)',
              border: '1px solid var(--chrome-line)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              color: 'var(--chalk)'
            }}
          >
            <option value="">No template (Meeting Minutes default)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {mode === 'record' ? (
            <div
              className="grid place-items-center gap-3.5 rounded-[10px] py-6"
              style={{ border: '1px dashed var(--chrome-line)', background: 'var(--well)' }}
            >
              <button
                onClick={recording ? handleStopAndSave : startRecording}
                disabled={working}
                aria-label={recording ? 'Stop recording' : 'Start recording'}
                className="grid place-items-center rounded-full"
                style={{
                  width: 56,
                  height: 56,
                  border: '2px solid var(--danger)',
                  background: recording ? 'var(--danger)' : 'transparent'
                }}
              >
                <span
                  style={{
                    width: recording ? 16 : 20,
                    height: recording ? 16 : 20,
                    borderRadius: recording ? 3 : '50%',
                    background: recording ? '#fff' : 'var(--danger)'
                  }}
                />
              </button>
              <div className="flex h-[26px] items-end gap-[3px]">
                {levels.map((v, i) => (
                  <i
                    key={i}
                    style={{
                      display: 'block',
                      width: 3,
                      height: `${Math.round(v * 100)}%`,
                      minHeight: 2,
                      background: recording ? 'var(--brass)' : 'var(--chrome-line)',
                      borderRadius: 2
                    }}
                  />
                ))}
              </div>
              <span
                className="text-[11px]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', letterSpacing: '.05em' }}
              >
                {working
                  ? 'Uploading and starting transcription…'
                  : recording
                  ? speechSupported
                    ? 'Recording — live transcript below'
                    : 'Recording — transcript arrives after upload (this browser has no live transcript)'
                  : 'Tap to start recording'}
              </span>
              {recording && liveTranscript && (
                <p
                  className="w-full text-left text-[12.5px]"
                  style={{ color: 'var(--chalk-dim)', maxHeight: 80, overflowY: 'auto', margin: 0 }}
                >
                  {liveTranscript}
                </p>
              )}
            </div>
          ) : (
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Paste your rough notes here. Fragments, shorthand, and half-sentences are fine — that's what the restructuring step is for."
              className="w-full resize-y rounded-[10px] p-[13px]"
              style={{
                minHeight: 150,
                background: 'var(--well)',
                border: '1px solid var(--chrome-line)',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--chalk)'
              }}
            />
          )}
          {error && (
            <p className="mt-2 text-sm" style={{ color: 'var(--danger-fg)' }}>
              {error}
            </p>
          )}
        </div>

        <footer
          className="flex items-center justify-end gap-2.5 px-5 py-4"
          style={{ borderTop: '1px solid var(--chrome-line)' }}
        >
          {working ? (
            <span
              className="mr-auto flex items-center gap-2.5 text-xs"
              style={{ color: 'var(--brass-text)', fontFamily: 'var(--font-mono)', letterSpacing: '.06em' }}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{
                  border: '2px solid rgba(201,162,39,.3)',
                  borderTopColor: 'var(--brass)',
                  animation: 'nf-spin .7s linear infinite'
                }}
              />
              {mode === 'record' ? 'Uploading…' : 'Restructuring…'}
            </span>
          ) : (
            <span
              className="mr-auto text-[10.5px]"
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '.05em' }}
            >
              {mode === 'record' ? 'Whisper transcribes after you stop · then Gemini restructures' : 'Gemini for restructuring · falls back to Groq on rate limit'}
            </span>
          )}
          <button
            onClick={handleClose}
            disabled={working}
            className="rounded-lg px-[13px] py-2 text-sm font-semibold"
            style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome-2)', color: 'var(--chalk)' }}
          >
            Cancel
          </button>
          {mode === 'paste' && (
            <button
              onClick={handleRestructure}
              disabled={working || !raw.trim()}
              className="rounded-lg px-[13px] py-2 text-sm font-semibold disabled:opacity-50"
              style={{ border: '1px solid var(--brass)', background: 'var(--brass)', color: 'var(--brass-ink)' }}
            >
              Restructure
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
