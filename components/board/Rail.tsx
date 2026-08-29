'use client'

import type { CSSProperties } from 'react'
import { TEMPLATES, TemplateType, DEFAULT_TEMPLATE_PIN } from '@/lib/tokens'
import { BoardNote } from './types'

interface RailProps {
  notes: BoardNote[]
  filterTmpl: TemplateType | null
  onFilterTmplChange: (tmpl: TemplateType | null) => void
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

export default function Rail({ notes, filterTmpl, onFilterTmplChange, className = '' }: RailProps) {
  const templateEntries = Object.entries(TEMPLATES) as [TemplateType, (typeof TEMPLATES)[TemplateType]][]

  const templates = [
    { key: null as TemplateType | null, name: 'All notes', pin: DEFAULT_TEMPLATE_PIN, count: notes.length }
  ].concat(
    templateEntries.map(([key, t]) => ({
      key,
      name: t.name + ('custom' in t && t.custom ? ' ✎' : ''),
      pin: t.pin,
      count: notes.filter((n) => n.tmpl === key).length
    }))
  )

  const openActionItems = notes.reduce((total, n) => {
    const items = (n.latestVersion?.body?.action_items as { item: string }[] | undefined) || []
    return total + items.length
  }, 0)

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
        {templates.map((t) => (
          <button
            key={t.key ?? '__all'}
            onClick={() => onFilterTmplChange(t.key)}
            style={railButtonStyle(t.key ? filterTmpl === t.key : !filterTmpl)}
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
      {openActionItems === 0 ? (
        <div className="py-4 text-sm" style={{ color: 'var(--muted)' }}>
          No open action items
        </div>
      ) : (
        <div>
          {notes.flatMap((n) => {
            const items =
              (n.latestVersion?.body?.action_items as { item: string; due_date?: string | null }[] | undefined) || []
            return items.map((a, i) => (
              <div
                key={`${n.id}-${i}`}
                style={{
                  padding: '8px 8px 8px 6px',
                  borderBottom: '1px solid var(--rule)',
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: 'var(--rail-fg)'
                }}
              >
                {a.item}
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
                  {n.title || 'Untitled note'}
                  {a.due_date ? ` · due ${a.due_date}` : ''}
                </em>
              </div>
            ))
          })}
        </div>
      )}
    </aside>
  )
}
