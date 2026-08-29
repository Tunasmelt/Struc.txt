'use client'

import { useEffect, useRef, useState } from 'react'
import { SPACE, MODE_CARD, DEFAULT_TEMPLATE_PIN } from '@/lib/tokens'
import { BoardNote, checklistFor, tagsFor } from './types'
import { TemplateField } from '@/lib/prompts/dynamicTemplate'

interface NoteCardProps {
  note: BoardNote
  snapGrid: boolean
  collapsed: boolean
  width: number
  stacked: boolean
  onCollapseToggle: () => void
  onResize: (w: number) => void
  onPositionChange: (id: string, position: { x: number; y: number }) => void
  onBringToFront: (id: string) => void
  onOpen: (id: string) => void
  onContextMenu: (id: string, x: number, y: number) => void
}

const labelStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9.5px',
  letterSpacing: '.11em',
  textTransform: 'uppercase' as const,
  color: 'var(--ink-2)',
  display: 'block',
  marginBottom: 3
}

function fmtDate(d: string | null) {
  if (!d) return ''
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function FieldValue({ field, value }: { field: TemplateField; value: unknown }) {
  if (value === undefined || value === null || value === '') return null

  switch (field.type) {
    case 'tags':
      if (!Array.isArray(value) || value.length === 0) return null
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((v, i) => (
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
              {String(v)}
            </i>
          ))}
        </div>
      )
    case 'list':
      if (!Array.isArray(value) || value.length === 0) return null
      return (
        <ul style={{ fontSize: '12.6px', lineHeight: 1.5, paddingLeft: 14, margin: 0 }}>
          {value.map((v, i) => (
            <li key={i}>{String(v)}</li>
          ))}
        </ul>
      )
    case 'checklist': {
      const items = Array.isArray(value) ? (value as { item?: string; done?: boolean }[]) : []
      if (items.length === 0) return null
      return (
        <ul style={{ fontSize: '12.6px', lineHeight: 1.6, paddingLeft: 0, margin: 0, listStyle: 'none' }}>
          {items.map((it, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span
                aria-hidden
                style={{
                  marginTop: 2,
                  width: 11,
                  height: 11,
                  flex: 'none',
                  borderRadius: 3,
                  border: '1px solid var(--card-line)',
                  background: it.done ? 'var(--card-chip)' : 'transparent'
                }}
              />
              <span style={{ textDecoration: it.done ? 'line-through' : 'none', opacity: it.done ? 0.65 : 1 }}>
                {it.item}
              </span>
            </li>
          ))}
        </ul>
      )
    }
    case 'longtext':
    case 'text':
    case 'date':
    case 'number':
    case 'select':
    default:
      return <div style={{ fontSize: '12.8px', lineHeight: 1.45 }}>{String(value)}</div>
  }
}

export default function NoteCard({
  note,
  snapGrid,
  collapsed,
  width,
  stacked,
  onCollapseToggle,
  onResize,
  onPositionChange,
  onBringToFront,
  onOpen,
  onContextMenu
}: NoteCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [position, setPosition] = useState({ x: note.position.x, y: note.position.y })

  const cardRef = useRef<HTMLElement>(null)
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, moved: false })
  const resizeRef = useRef({ startX: 0, startW: width })

  // Keep local position in sync when the note's server-side position changes
  // out from under us (stack/auto-arrange/restore), but not mid-drag.
  useEffect(() => {
    if (!isDragging) setPosition({ x: note.position.x, y: note.position.y })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.position.x, note.position.y])

  const tmpl = note.tmpl
  const pinColor = tmpl?.pin ?? DEFAULT_TEMPLATE_PIN
  const templateName = tmpl?.name ?? 'Untitled capture'

  const body = note.latestVersion?.body as Record<string, unknown> | undefined
  const sortedFields = tmpl ? [...tmpl.fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : []
  const actions = checklistFor(note)
  const openActions = actions.filter((i) => !i.done).length
  const tags = tagsFor(note)

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
    } else {
      onOpen(note.id)
    }
  }

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation()
    resizeRef.current = { startX: e.clientX, startW: width }
    setIsResizing(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing) return
    const w = Math.max(SPACE.noteWMin, Math.min(SPACE.noteWMax, resizeRef.current.startW + (e.clientX - resizeRef.current.startX)))
    onResize(w)
  }

  const handleResizeEnd = (e: React.PointerEvent) => {
    setIsResizing(false)
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault()
      onOpen(note.id)
    }
  }

  return (
    <article
      ref={cardRef}
      data-note={note.id}
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
        border: `1px solid ${note.pinned ? 'var(--brass)' : 'var(--card-line)'}`,
        transform: isDragging ? 'scale(1.02)' : isHovering ? 'translateY(-2px)' : 'none',
        boxShadow: isDragging ? 'var(--shadow-note-drag)' : isHovering ? 'var(--shadow-note-hover)' : 'var(--shadow-note)',
        transition: isDragging || isResizing ? 'none' : stacked ? 'var(--t-stacked)' : 'transform .16s ease, box-shadow .16s ease, width .16s ease',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => !isDragging && setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => {
        e.preventDefault()
        onBringToFront(note.id)
        onContextMenu(note.id, e.clientX, e.clientY)
      }}
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
        <span className="flex items-center gap-1 flex-none">
          {note.pinned && (
            <span
              title="Pinned — ignored by stack and auto-arrange"
              style={{
                fontSize: 9,
                letterSpacing: '.1em',
                color: 'var(--brass-text)',
                border: '1px solid var(--brass)',
                borderRadius: 99,
                padding: '1px 6px'
              }}
            >
              PIN
            </span>
          )}
          <button
            data-act="collapse"
            onClick={(e) => {
              e.stopPropagation()
              onCollapseToggle()
            }}
            aria-label={collapsed ? 'Expand note' : 'Collapse note'}
            title={collapsed ? 'Expand note' : 'Collapse note'}
            className="grid place-items-center rounded"
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
        </span>
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
            {!body || !tmpl ? (
              <p style={{ fontSize: '12.8px', lineHeight: 1.45, color: 'var(--ink-2)' }}>
                {note.raw_text.length > 220 ? note.raw_text.slice(0, 220) + '…' : note.raw_text}
                <br />
                <em style={{ fontStyle: 'normal', color: 'var(--muted)' }}>Restructuring…</em>
              </p>
            ) : (
              <>
                {sortedFields.map((field) => {
                  const value = body[field.key]
                  if (value === undefined || value === null || value === '') return null
                  return (
                    <div key={field.key} style={{ marginBottom: 10 }}>
                      <span style={labelStyle}>{field.label}</span>
                      <FieldValue field={field} value={value} />
                    </div>
                  )
                })}
              </>
            )}
          </div>

          <footer
            className="flex flex-wrap items-center gap-1.5"
            style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--card-rule)' }}
          >
            {tags.map((t) => (
              <span
                key={t}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-2)', background: 'var(--card-chip)', padding: '3px 8px', borderRadius: 99 }}
              >
                #{t}
              </span>
            ))}
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
            style={{ right: 4, bottom: 4, width: 16, height: 16, color: 'var(--ink-2)', cursor: 'nwse-resize', opacity: isHovering ? 0.9 : 0.35 }}
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
