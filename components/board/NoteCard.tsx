'use client'

import { useEffect, useRef, useState } from 'react'
import { SPACE, MODE_CARD, DEFAULT_TEMPLATE_PIN } from '@/lib/tokens'
import { BoardNote, checklistFor, tagsFor, suggestedNoteTags } from './types'
import { TemplateField } from '@/lib/prompts/dynamicTemplate'
import { noteToText } from '@/lib/board/exportNote'

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
  onToggleActionItem: (id: string, done: boolean) => void
  onConfirmTag: (id: string) => void
  onRejectTag: (id: string) => void
  onEditTitle: (id: string, title: string) => void
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
  onContextMenu,
  onToggleActionItem,
  onConfirmTag,
  onRejectTag,
  onEditTitle
}: NoteCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(note.title || '')
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

  useEffect(() => {
    if (!editingTitle) setTitleDraft(note.title || '')
  }, [note.title, editingTitle])

  const commitTitle = () => {
    setEditingTitle(false)
    const next = titleDraft.trim()
    if (next && next !== (note.title || '')) onEditTitle(note.id, next)
    else setTitleDraft(note.title || '')
  }

  const tmpl = note.tmpl
  const pinColor = tmpl?.pin ?? DEFAULT_TEMPLATE_PIN
  const templateName = tmpl?.name ?? 'Untitled capture'

  const body = note.latestVersion?.body as Record<string, unknown> | undefined
  const sortedFields = tmpl ? [...tmpl.fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : []
  const actions = checklistFor(note)
  const openActions = actions.filter((i) => !i.done).length
  const tags = tagsFor(note)
  const suggested = suggestedNoteTags(note)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(noteToText(note))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy note text:', err)
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-act]')) return
    onBringToFront(note.id)
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: position.x, initialY: position.y, moved: false }
    // Pinning only excluded a note from stack/auto-arrange before — it
    // could still be freely dragged, which doesn't match what "pin"
    // actually means to anyone using it. Locking position is the point.
    // dragRef is still reset above so a click still opens the note
    // (handlePointerUp checks dragRef.current.moved, which needs to be
    // fresh here, not left over from the last time this note *was*
    // draggable).
    if (note.pinned) return
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
        cursor: note.pinned ? 'default' : isDragging ? 'grabbing' : 'grab',
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
            data-act="copy"
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : 'Copy note text'}
            title={copied ? 'Copied' : 'Copy note text'}
            className="grid place-items-center rounded"
            style={{ width: 18, height: 18, color: copied ? 'var(--brass-text)' : 'var(--ink-2)', opacity: 0.75 }}
          >
            {copied ? (
              <svg width="11" height="11" viewBox="0 0 12 12">
                <path d="M2 6.5L4.7 9L10 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 12 12">
                <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <path d="M2.5 8V2.5C2.5 1.94772 2.94772 1.5 3.5 1.5H8" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              </svg>
            )}
          </button>
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

      {editingTitle ? (
        <input
          data-act="edit-title"
          autoFocus
          value={titleDraft}
          maxLength={100}
          onChange={(e) => setTitleDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitTitle()
            } else if (e.key === 'Escape') {
              setTitleDraft(note.title || '')
              setEditingTitle(false)
            }
          }}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: '-.015em',
            lineHeight: 1.25,
            margin: collapsed ? '8px 0 0' : '8px 0 11px',
            width: '100%',
            background: 'var(--well)',
            border: '1px solid var(--brass)',
            borderRadius: 6,
            padding: '2px 6px',
            color: 'var(--ink)'
          }}
        />
      ) : (
        <h3
          data-act="edit-title"
          title="Click to rename"
          onClick={(e) => {
            e.stopPropagation()
            setEditingTitle(true)
          }}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: '-.015em',
            lineHeight: 1.25,
            margin: collapsed ? '8px 0 0' : '8px 0 11px',
            cursor: 'text'
          }}
        >
          {note.title || 'Untitled capture'}
        </h3>
      )}

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
            {suggested.map((t) => (
              <span
                key={t.id}
                data-act="tag"
                title="Suggested by enrichment — confirm or dismiss"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--muted)',
                  background: 'transparent',
                  border: '1px dashed var(--card-line)',
                  padding: '2px 4px 2px 8px',
                  borderRadius: 99
                }}
              >
                #{t.tags!.name}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onConfirmTag(t.id)
                  }}
                  aria-label={`Confirm tag ${t.tags!.name}`}
                  style={{ color: 'var(--brass-text)', padding: '0 2px', lineHeight: 1 }}
                >
                  ✓
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRejectTag(t.id)
                  }}
                  aria-label={`Dismiss tag ${t.tags!.name}`}
                  style={{ color: 'var(--muted)', padding: '0 2px', lineHeight: 1 }}
                >
                  ×
                </button>
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

          {(note.action_items?.length ?? 0) > 0 && (
            <div data-act="action-items" style={{ marginTop: 10 }}>
              <span style={labelStyle}>Action items</span>
              {(note.action_items || []).map((item) => (
                <label
                  key={item.id}
                  style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: '12.6px', lineHeight: 1.4, marginBottom: 4 }}
                >
                  <input
                    type="checkbox"
                    checked={item.status === 'done'}
                    onChange={(e) => {
                      e.stopPropagation()
                      onToggleActionItem(item.id, e.target.checked)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: 2, accentColor: 'var(--brass)' }}
                  />
                  <span style={{ textDecoration: item.status === 'done' ? 'line-through' : 'none', opacity: item.status === 'done' ? 0.6 : 1 }}>
                    {item.text}
                    {item.due_date && (
                      <em style={{ fontStyle: 'normal', color: 'var(--muted)', marginLeft: 6, fontSize: 11 }}>due {item.due_date}</em>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}

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
