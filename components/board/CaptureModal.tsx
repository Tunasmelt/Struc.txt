'use client'

import { useState } from 'react'
import { createNote } from '@/app/actions/notes'

interface CaptureModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

/** Paste-capture only. The prototype also offers a "Record" tab, but audio
 *  capture/transcription isn't wired up anywhere in this repo yet — scoping
 *  this modal to paste keeps it honest about what actually works. */
export default function CaptureModal({ open, onClose, onCreated }: CaptureModalProps) {
  const [raw, setRaw] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleRestructure = async () => {
    if (!raw.trim() || working) return
    setWorking(true)
    setError(null)
    try {
      await createNote(raw)
      setRaw('')
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-start justify-center overflow-auto p-6"
      style={{ background: 'rgba(8,7,6,.72)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
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
            onClick={onClose}
            aria-label="Close"
            className="px-2 py-1 text-xl leading-none"
            style={{ color: 'var(--chalk-dim)' }}
          >
            ×
          </button>
        </header>

        <div className="p-5">
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
              Restructuring…
            </span>
          ) : (
            <span
              className="mr-auto text-[10.5px]"
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '.05em' }}
            >
              Gemini for restructuring · falls back to Groq on rate limit
            </span>
          )}
          <button
            onClick={onClose}
            disabled={working}
            className="rounded-lg px-[13px] py-2 text-sm font-semibold"
            style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome-2)', color: 'var(--chalk)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleRestructure}
            disabled={working || !raw.trim()}
            className="rounded-lg px-[13px] py-2 text-sm font-semibold disabled:opacity-50"
            style={{ border: '1px solid var(--brass)', background: 'var(--brass)', color: 'var(--brass-ink)' }}
          >
            Restructure
          </button>
        </footer>
      </div>
    </div>
  )
}
