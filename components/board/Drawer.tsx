'use client'

import { useState } from 'react'
import { BoardNote, ResolvedTemplate, checklistFor, tagsFor } from './types'
import { applyTemplateToNote } from '@/app/actions/notes'

interface DrawerProps {
  note: BoardNote | null
  open: boolean
  templates: ResolvedTemplate[]
  onClose: () => void
  onPin: () => void
  onArchive: () => void
  onDuplicate: () => void
  onExportImage: () => void
  onReran: () => void
  checklistOverrides: Record<string, boolean>
  onToggleChecklistItem: (noteId: string, index: number) => void
}

function fmtDate(d: string | null) {
  if (!d) return ''
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function segStyle(on: boolean) {
  return {
    padding: '7px 14px',
    fontSize: 12.5,
    fontWeight: on ? 600 : 400,
    color: on ? 'var(--chalk)' : 'var(--chalk-dim)',
    background: on ? 'var(--hover)' : 'transparent'
  }
}

const btnStyle = {
  border: '1px solid var(--chrome-line)',
  borderRadius: 8,
  padding: '8px 13px',
  fontWeight: 600 as const,
  fontSize: 13,
  background: 'var(--chrome-2)',
  color: 'var(--chalk)',
  transition: 'var(--t-btn)'
}

export default function Drawer({
  note,
  open,
  templates,
  onClose,
  onPin,
  onArchive,
  onDuplicate,
  onExportImage,
  onReran,
  checklistOverrides,
  onToggleChecklistItem
}: DrawerProps) {
  const [showRaw, setShowRaw] = useState(false)
  const [rerunKey, setRerunKey] = useState('')
  const [rerunBusy, setRerunBusy] = useState(false)

  const tmpl = note?.tmpl
  const body = note?.latestVersion?.body || {}
  const actions = note ? checklistFor(note) : []
  const tags = note ? tagsFor(note) : []

  const handleRerun = async () => {
    if (!note || rerunBusy) return
    const targetId = rerunKey || note.tmpl?.id
    if (!targetId) return
    setRerunBusy(true)
    try {
      await applyTemplateToNote(note.id, targetId)
      onReran()
    } catch (err) {
      console.error('Failed to re-run template:', err)
    } finally {
      setRerunBusy(false)
    }
  }

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(440px,100%)',
        zIndex: 60,
        background: 'var(--chrome-2)',
        borderLeft: '1px solid var(--chrome-line)',
        transform: open ? 'none' : 'translateX(101%)',
        boxShadow: open ? 'var(--shadow-drawer)' : 'none',
        transition: 'var(--t-drawer)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {note && (
        <>
          <header style={{ padding: '16px 18px', borderBottom: '1px solid var(--chrome-line)', position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: 'var(--chalk-dim)'
              }}
            >
              <span className="inline-block flex-none rounded-full" style={{ width: 9, height: 9, background: tmpl?.pin ?? 'var(--rail-dot)' }} />
              <span>{tmpl?.name ?? 'Untitled template'}</span>
              <span>· {fmtDate(note.created_at)}</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-.025em', margin: '10px 0 0', lineHeight: 1.15 }}>
              {note.title || 'Untitled capture'}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close note"
              style={{ position: 'absolute', top: 14, right: 14, fontSize: 20, lineHeight: 1, color: 'var(--chalk-dim)', padding: '4px 8px' }}
            >
              ×
            </button>
          </header>

          <div style={{ display: 'flex', gap: 8, margin: '12px 18px 0', flexWrap: 'wrap' }}>
            <button className="nf-btn" onClick={onExportImage} title="Export this note as an image" style={btnStyle}>
              Export image
            </button>
            <button className="nf-btn" onClick={onDuplicate} title="Duplicate this note" style={btnStyle}>
              Duplicate
            </button>
            <button className="nf-btn" onClick={onPin} style={btnStyle}>
              {note.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button className="nf-btn" onClick={onArchive} style={btnStyle}>
              {note.archived ? 'Restore' : 'Archive'}
            </button>
          </div>

          <div
            role="group"
            aria-label="Version"
            style={{ display: 'flex', margin: '14px 18px 0', border: '1px solid var(--chrome-line)', borderRadius: 8, overflow: 'hidden', width: 'max-content' }}
          >
            <button onClick={() => setShowRaw(false)} style={segStyle(!showRaw)}>
              Structured
            </button>
            <button onClick={() => setShowRaw(true)} style={segStyle(showRaw)}>
              Raw capture
            </button>
          </div>

          <div style={{ padding: '16px 18px 30px', overflowY: 'auto', flex: 1 }}>
            {showRaw ? (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                  Captured {fmtDate(note.created_at)} · unedited
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12.5,
                    lineHeight: 1.7,
                    color: 'var(--chalk-dim)',
                    whiteSpace: 'pre-wrap',
                    background: 'var(--well)',
                    border: '1px solid var(--chrome-line)',
                    padding: 14,
                    borderRadius: 8
                  }}
                >
                  {note.raw_text}
                </div>
                <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--chrome-line)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.05em' }}>
                    This is what you gave it. Nothing here is ever overwritten.
                  </span>
                </div>
              </div>
            ) : (
              <div>
                {!tmpl ? (
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>Still restructuring…</p>
                ) : (
                  tmpl.fields
                    .slice()
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((field) => {
                      const value = body[field.key]
                      if (value === undefined || value === null || value === '' || field.type === 'checklist' || field.type === 'tags') return null
                      const lines = Array.isArray(value) ? value.map(String) : [String(value)]
                      return (
                        <div key={field.key} style={{ marginBottom: 16 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--brass-text)', display: 'block', marginBottom: 5 }}>
                            {field.label}
                          </span>
                          <div style={{ lineHeight: 1.55, color: 'var(--drawer-fg)', fontSize: 14 }}>
                            {lines.map((l, i) => (
                              <div key={i}>{l}</div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                )}

                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--brass-text)', display: 'block', marginBottom: 5 }}>
                    Tags
                  </span>
                  <div style={{ lineHeight: 1.55, color: 'var(--drawer-fg)', fontSize: 14 }}>
                    {tags.length ? tags.map((t) => `#${t}`).join(' ') : '—'}
                  </div>
                </div>

                {actions.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--brass-text)', display: 'block', marginBottom: 5 }}>
                      Action items
                    </span>
                    {actions.map((a, i) => {
                      const key = `${note.id}:${i}`
                      const done = key in checklistOverrides ? checklistOverrides[key] : !!a.done
                      return (
                        <label key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--line-2)', fontSize: 14 }}>
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={() => onToggleChecklistItem(note.id, i)}
                            style={{ accentColor: 'var(--brass)', marginTop: 3 }}
                          />
                          <span style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.65 : 1 }}>
                            {a.item}
                            {a.due && <span style={{ color: 'var(--muted)', fontSize: 12 }}> · due {a.due}</span>}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--chrome-line)', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.05em' }}>Re-run as</span>
                  <select
                    value={rerunKey || note.tmpl?.id || ''}
                    onChange={(e) => setRerunKey(e.target.value)}
                    style={{ background: 'var(--chrome)', border: '1px solid var(--chrome-line)', padding: '7px 9px', borderRadius: 8, color: 'var(--chalk)' }}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button className="nf-btn" onClick={handleRerun} style={btnStyle} disabled={rerunBusy}>
                    {rerunBusy ? 'Working…' : 'Restructure again'}
                  </button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.05em', width: '100%' }}>
                    Keeps every earlier version. Nothing is lost by trying another shape.
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
