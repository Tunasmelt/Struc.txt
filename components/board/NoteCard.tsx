'use client'

import { useRef, useState } from 'react'
import { SPACE, MODE_CARD, TEMPLATES, TemplateType, DEFAULT_TEMPLATE_PIN } from '@/lib/tokens'
import { BoardNote } from './types'

interface NoteCardProps {
  note: BoardNote
  snapGrid: boolean
  onPositionChange: (id: string, position: { x: number; y: number }) => void
  onBringToFront: (id: string) => void
}

interface MeetingBody {
  summary?: string
  attendees?: string[]
  key_decisions?: string[]
  discussion_points?: { topic: string; details: string }[]
  action_items?: { item: string; assignee?: string | null; due_date?: string | null }[]
  fallback_unstructured?: boolean
}

function fmtDate(d: string | null) {
  if (!d) return ''
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function NoteCard({ note, snapGrid, onPositionChange, onBringToFront }: NoteCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [width, setWidth] = useState<number>(SPACE.noteW)
  const [position, setPosition] = useState({ x: note.position.x, y: note.position.y })

  const cardRef = useRef<HTMLElement>(null)
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, moved: false })

  const tmplKey: TemplateType | null = note.tmpl
  const tmpl = tmplKey ? TEMPLATES[tmplKey] : null
  const pinColor = tmpl?.pin ?? DEFAULT_TEMPLATE_PIN
  const templateName = tmpl?.name ?? 'Untitled capture'

  const body = note.latestVersion?.body as MeetingBody | undefined
  const openActions = (body?.action_items || []).length

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-act]')) return
    onBringToFront(note.id)
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: position.x, initialY: position.y, moved: false }
    setIsDragging(true)
    cardRef.current?.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true
    let nx = Math.max(0, dragRef.current.initialX + dx)
    let ny = Math.max(0, dragRef.current.initialY + dy)
    if (snapGrid) {
      nx = Math.round(nx / SPACE.gridSnap) * SPACE.gridSnap
      ny = Math.round(ny / SPACE.gridSnap) * SPACE.gridSnap
    }
    setPosition({ x: nx, y: ny })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    cardRef.current?.releasePointerCapture(e.pointerId)
    if (dragRef.current.moved) {
      onPositionChange(note.id, position)
    }
  }

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing) return
    setWidth((w) => Math.max(SPACE.noteWMin, Math.min(SPACE.noteWMax, w + e.movementX)))
  }

  const handleResizeEnd = (e: React.PointerEvent) => {
    setIsResizing(false)
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  return (
    <article
      ref={cardRef}
      tabIndex={0}
      role="button"
      style={{
        position: 'absolute',
        width,
        left: position.x,
        top: position.y,
        zIndex: note.position.z_index,
        background: 'var(--card-bg)',
        color: 'var(--ink)',
        padding: MODE_CARD.padding,
        borderRadius: MODE_CARD.radius,
        border: '1px solid var(--card-line)',
        boxShadow: isDragging ? 'var(--shadow-note-drag)' : 'var(--shadow-note)',
        transition: isDragging || isResizing ? 'none' : 'var(--t-note)',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="flex items-center justify-between gap-1.5 overflow-hidden"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9.5px',
          letterSpacing: '.11em',
          textTransform: 'uppercase',
          color: 'var(--ink-2)'
        }}
      >
        <span className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-ellipsis">
          <span
            className="inline-block flex-none rounded-full"
            style={{ width: 7, height: 7, background: pinColor }}
          />
          {templateName} · {fmtDate(note.created_at)}
        </span>
        <button
          data-act="collapse"
          onClick={(e) => {
            e.stopPropagation()
            setCollapsed((c) => !c)
          }}
          aria-label={collapsed ? 'Expand note' : 'Collapse note'}
          title={collapsed ? 'Expand note' : 'Collapse note'}
          className="grid flex-none place-items-center rounded"
          style={{
            width: 18,
            height: 18,
            color: 'var(--ink-2)',
            opacity: 0.75,
            transform: collapsed ? 'rotate(-90deg)' : 'none'
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path
              d="M2 3.5L5 6.5L8 3.5"
              stroke="currentColor"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: '-.015em',
          lineHeight: 1.25,
          margin: collapsed ? '8px 0 0' : '8px 0 11px'
        }}
      >
        {note.title || 'Untitled capture'}
      </h3>

      {!collapsed && (
        <>
          <div style={{ height: 1, background: 'var(--card-rule)', margin: '0 -16px 12px' }} />

          <div>
            {!body ? (
              <p style={{ fontSize: '12.8px', lineHeight: 1.45, color: 'var(--ink-2)' }}>
                {note.raw_text.length > 220 ? note.raw_text.slice(0, 220) + '…' : note.raw_text}
                <br />
                <em style={{ fontStyle: 'normal', color: 'var(--muted)' }}>Restructuring…</em>
              </p>
            ) : (
              <>
                {body.summary && (
                  <div style={{ marginBottom: 10 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9.5px',
                        letterSpacing: '.11em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-2)',
                        display: 'block',
                        marginBottom: 3
                      }}
                    >
                      Summary
                    </span>
                    <div style={{ fontSize: '12.8px', lineHeight: 1.45 }}>{body.summary}</div>
                  </div>
                )}

                {!!body.attendees?.length && (
                  <div style={{ marginBottom: 10 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9.5px',
                        letterSpacing: '.11em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-2)',
                        display: 'block',
                        marginBottom: 3
                      }}
                    >
                      Attendees
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {body.attendees.map((p, i) => (
                        <i
                          key={i}
                          style={{
                            fontStyle: 'normal',
                            fontSize: 11,
                            background: 'var(--card-chip)',
                            border: '1px solid var(--card-line)',
                            padding: '2px 8px',
                            borderRadius: 99
                          }}
                        >
                          {p}
                        </i>
                      ))}
                    </div>
                  </div>
                )}

                {!!body.key_decisions?.length && (
                  <div style={{ marginBottom: 10 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9.5px',
                        letterSpacing: '.11em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-2)',
                        display: 'block',
                        marginBottom: 3
                      }}
                    >
                      Decisions
                    </span>
                    <ul style={{ fontSize: '12.6px', lineHeight: 1.5, paddingLeft: 14, margin: 0 }}>
                      {body.key_decisions.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!!body.discussion_points?.length &&
                  body.discussion_points.map((p, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9.5px',
                          letterSpacing: '.11em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-2)',
                          display: 'block',
                          marginBottom: 3
                        }}
                      >
                        {p.topic}
                      </span>
                      <div style={{ fontSize: '12.8px', lineHeight: 1.45 }}>{p.details}</div>
                    </div>
                  ))}
              </>
            )}
          </div>

          <footer
            className="flex flex-wrap items-center gap-1.5"
            style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--card-rule)' }}
          >
            {openActions > 0 && (
              <span
                style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: 'var(--ink-2)' }}
              >
                {openActions} open
              </span>
            )}
          </footer>

          <span
            data-act="resize"
            title="Drag to resize"
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            className="absolute grid place-items-center"
            style={{ right: 4, bottom: 4, width: 16, height: 16, color: 'var(--ink-2)', cursor: 'nwse-resize', opacity: 0.35 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block' }}>
              <path d="M12.5 5.5L5.5 12.5M12.5 9.5L9.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
    </article>
  )
}
