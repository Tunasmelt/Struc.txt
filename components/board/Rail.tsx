'use client'

import type { CSSProperties } from 'react'
import { DEFAULT_TEMPLATE_PIN } from '@/lib/tokens'
import { BoardNote, ResolvedTemplate } from './types'

interface RailProps {
  notes: BoardNote[]
  templates: ResolvedTemplate[]
  filterTmpl: string | null
  onFilterTmplChange: (tmplId: string | null) => void
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

/** Finds the first checklist-typed field on a note's template so the
 *  "open action items" rail works for any template, not just meeting minutes. */
function checklistItemsFor(note: BoardNote): { item: string; done?: boolean }[] {
  const checklistField = note.tmpl?.fields.find((f) => f.type === 'checklist')
  if (!checklistField) return []
  const value = note.latestVersion?.body?.[checklistField.key]
  return Array.isArray(value) ? (value as { item: string; done?: boolean }[]) : []
}

export default function Rail({ notes, templates, filterTmpl, onFilterTmplChange, className = '' }: RailProps) {
  const templateRows = [
    { id: null as string | null, name: 'All notes', pin: DEFAULT_TEMPLATE_PIN, count: notes.length }
  ].concat(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      pin: t.pin,
      count: notes.filter((n) => n.tmpl?.id === t.id).length
    }))
  )

  const openItems = notes.flatMap((n) => checklistItemsFor(n).filter((i) => !i.done).map((i) => ({ note: n, item: i })))

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
        Open action items
      </h4>
      {openItems.length === 0 ? (
        <div className="py-4 text-sm" style={{ color: 'var(--muted)' }}>
          No open action items
        </div>
      ) : (
        <div>
          {openItems.map(({ note, item }, i) => (
            <div
              key={`${note.id}-${i}`}
              style={{
                padding: '8px 8px 8px 6px',
                borderBottom: '1px solid var(--rule)',
                fontSize: 13,
                lineHeight: 1.4,
                color: 'var(--rail-fg)'
              }}
            >
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
              </em>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
