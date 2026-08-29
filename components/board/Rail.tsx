'use client'

import type { CSSProperties } from 'react'
import { DEFAULT_TEMPLATE_PIN } from '@/lib/tokens'
import { BoardNote, ResolvedTemplate, checklistFor } from './types'

interface RailProps {
  liveNotes: BoardNote[]
  archivedCount: number
  templates: ResolvedTemplate[]
  filterTmpl: string | null
  onFilterTmplChange: (tmplId: string | null) => void
  showArchived: boolean
  onShowArchivedChange: (show: boolean) => void
  onToggleTodo: (noteId: string, index: number) => void
  checklistOverrides: Record<string, boolean>
  className?: string
}

function railButtonStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    textAlign: 'left',
    padding: '7px 8px',
    borderRadius: 7,
    fontSize: '13.5px',
    color: active ? 'var(--chalk)' : 'var(--rail-fg)',
    background: active ? 'var(--hover)' : 'transparent',
    fontWeight: active ? 600 : 400
  }
}

export default function Rail({
  liveNotes,
  archivedCount,
  templates,
  filterTmpl,
  onFilterTmplChange,
  showArchived,
  onShowArchivedChange,
  onToggleTodo,
  checklistOverrides,
  className = ''
}: RailProps) {
  const templateRows = [
    { id: null as string | null, name: 'All notes', pin: DEFAULT_TEMPLATE_PIN, count: liveNotes.length }
  ].concat(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      pin: t.pin,
      count: liveNotes.filter((n) => n.tmpl?.id === t.id).length
    }))
  )

  const todoItems = liveNotes.flatMap((n) =>
    checklistFor(n).map((item, i) => ({ note: n, item, i })).filter(({ item, i }) => {
      const key = `${n.id}:${i}`
      const done = key in checklistOverrides ? checklistOverrides[key] : !!item.done
      return !done
    })
  )

  return (
    <aside
      className={`overflow-y-auto ${className}`}
      style={{
        background: 'var(--chrome)',
        borderRight: '1px solid var(--chrome-line)',
        padding: 'var(--rail-pad)',
        width: 'var(--rail-w)',
        flex: 'none'
      }}
    >
      <h4
        className="mb-2 mt-0 text-xs font-medium uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 10, margin: '0 0 8px 6px' }}
      >
        Templates
      </h4>
      <div className="flex flex-col gap-px">
        {templateRows.map((t) => (
          <button
            key={t.id ?? '__all'}
            className="nf-rail-btn"
            onClick={() => onFilterTmplChange(t.id)}
            style={railButtonStyle(t.id ? filterTmpl === t.id : !filterTmpl)}
          >
            <span
              className="inline-block flex-none rounded-full"
              style={{ width: 9, height: 9, background: t.pin }}
            />
            <span className="flex-1">{t.name}</span>
            <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{t.count}</span>
          </button>
        ))}
      </div>

      <h4
        className="text-xs font-medium uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 10, margin: '22px 0 8px 6px' }}
      >
        View
      </h4>
      <div className="flex flex-col gap-px">
        <button className="nf-rail-btn" onClick={() => onShowArchivedChange(false)} style={railButtonStyle(!showArchived)}>
          <span className="flex-1">Board</span>
          <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{liveNotes.length}</span>
        </button>
        <button className="nf-rail-btn" onClick={() => onShowArchivedChange(true)} style={railButtonStyle(showArchived)}>
          <span className="flex-1">Archived</span>
          <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{archivedCount}</span>
        </button>
      </div>

      <h4
        className="text-xs font-medium uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 10, margin: '22px 0 8px 6px' }}
      >
        Open action items
      </h4>
      {todoItems.length === 0 ? (
        <div className="py-4 text-sm" style={{ color: 'var(--muted)' }}>
          No open action items
        </div>
      ) : (
        <div>
          {todoItems.map(({ note, item, i }) => (
            <label
              key={`${note.id}-${i}`}
              style={{
                padding: '8px 8px 8px 6px',
                display: 'flex',
                gap: 9,
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--rule)',
                fontSize: 13,
                lineHeight: 1.4,
                color: 'var(--rail-fg)'
              }}
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => onToggleTodo(note.id, i)}
                style={{ marginTop: 2, accentColor: 'var(--brass)' }}
              />
              <span>
                {item.item}
                <em
                  style={{
                    display: 'block',
                    fontStyle: 'normal',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--muted)',
                    marginTop: 3,
                    letterSpacing: '.04em'
                  }}
                >
                  {note.title || 'Untitled note'}
                  {item.due ? ` · due ${item.due}` : ''}
                </em>
              </span>
            </label>
          ))}
        </div>
      )}
    </aside>
  )
}
