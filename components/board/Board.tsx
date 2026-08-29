'use client'

import type { CSSProperties } from 'react'
import NoteCard from './NoteCard'
import { BoardNote } from './types'

export type SortKey = 'recent' | 'title' | 'template'

interface Chip {
  key: string
  label: string
  active: boolean
}

interface BoardProps {
  notes: BoardNote[]
  loading: boolean
  snapGrid: boolean
  stacked: boolean
  collapsedIds: Set<string>
  widths: Record<string, number>
  showArchived: boolean
  rangeChips: Chip[]
  onRangeChange: (key: string) => void
  tagChips: Chip[]
  onTagChange: (key: string) => void
  sort: SortKey
  onSortChange: (key: SortKey) => void
  countLabel: string
  onPositionChange: (id: string, position: { x: number; y: number }) => void
  onBringToFront: (id: string) => void
  onCollapseToggle: (id: string) => void
  onResize: (id: string, w: number) => void
  onOpen: (id: string) => void
  onContextMenu: (id: string, x: number, y: number) => void
}

function chipStyle(on: boolean): CSSProperties {
  return on
    ? { border: '1px solid var(--brass)', borderRadius: 99, padding: '4px 11px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.04em', background: 'var(--brass)', color: 'var(--brass-ink)', fontWeight: 600 }
    : { border: '1px solid var(--chrome-line)', borderRadius: 99, padding: '4px 11px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.04em', color: 'var(--chip-fg)', background: 'var(--chrome-2)' }
}

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'title', label: 'Title' },
  { key: 'template', label: 'Template' }
]

export default function Board({
  notes,
  loading,
  snapGrid,
  stacked,
  collapsedIds,
  widths,
  showArchived,
  rangeChips,
  onRangeChange,
  tagChips,
  onTagChange,
  sort,
  onSortChange,
  countLabel,
  onPositionChange,
  onBringToFront,
  onCollapseToggle,
  onResize,
  onOpen,
  onContextMenu
}: BoardProps) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--felt)' }}>
        <div style={{ color: 'var(--muted)' }}>Loading board…</div>
      </div>
    )
  }

  const labelStyle: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '.15em',
    textTransform: 'uppercase',
    color: 'var(--board-lbl)'
  }

  return (
    <main
      data-nf="board-scroll"
      className="relative flex-1 overflow-auto"
      style={{ background: 'var(--felt)' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(var(--board-grid) 1px, transparent 1px), linear-gradient(90deg, var(--board-grid) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          zIndex: 0
        }}
      />

      <div
        className="sticky top-0 z-[6] flex flex-wrap items-center gap-1.5 px-5 py-3"
        style={{ background: 'var(--felt)' }}
      >
        <span style={{ ...labelStyle, marginRight: 2 }}>Filter</span>
        {rangeChips.map((c) => (
          <button key={c.key} onClick={() => onRangeChange(c.key)} style={chipStyle(c.active)}>
            {c.label}
          </button>
        ))}
        <span style={{ ...labelStyle, marginLeft: 10, marginRight: 2 }}>Tags</span>
        {tagChips.length === 0 ? (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>none yet</span>
        ) : (
          tagChips.map((c) => (
            <button key={c.key} onClick={() => onTagChange(c.key)} style={chipStyle(c.active)}>
              {c.label}
            </button>
          ))
        )}
        <span style={{ ...labelStyle, marginLeft: 10, marginRight: 2 }}>Arrange by</span>
        {sortOptions.map((o) => (
          <button key={o.key} onClick={() => onSortChange(o.key)} style={chipStyle(sort === o.key)}>
            {o.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--board-lbl)' }}>{countLabel}</span>
      </div>

      <div
        data-nf="board"
        className="relative"
        style={{
          minHeight: 'var(--board-min-h)',
          minWidth: 'var(--board-min-w)',
          padding: 'var(--board-pad)',
          zIndex: 1
        }}
      >
        {notes.length === 0 ? (
          <div
            className="absolute left-0 right-0 top-[60px] text-center"
            style={{ color: 'var(--board-lbl)', zIndex: 1 }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.05em' }}>
              {showArchived ? 'Nothing archived yet.' : 'Nothing on the board matches that.'}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.05em', opacity: 0.7 }}>
              {showArchived ? 'Archive a note to tuck it away here.' : 'Clear a filter, or pin a new capture.'}
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              snapGrid={snapGrid}
              stacked={stacked}
              collapsed={collapsedIds.has(note.id)}
              width={widths[note.id] ?? 262}
              onCollapseToggle={() => onCollapseToggle(note.id)}
              onResize={(w) => onResize(note.id, w)}
              onPositionChange={onPositionChange}
              onBringToFront={onBringToFront}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
            />
          ))
        )}
      </div>
    </main>
  )
}
