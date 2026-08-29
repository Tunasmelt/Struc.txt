'use client'

import NoteCard from './NoteCard'
import { BoardNote } from './types'

interface BoardProps {
  notes: BoardNote[]
  totalCount: number
  loading: boolean
  snapGrid: boolean
  onPositionChange: (id: string, position: { x: number; y: number }) => void
  onBringToFront: (id: string) => void
}

export default function Board({ notes, totalCount, loading, snapGrid, onPositionChange, onBringToFront }: BoardProps) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--felt)' }}>
        <div style={{ color: 'var(--muted)' }}>Loading board…</div>
      </div>
    )
  }

  return (
    <main
      className="relative flex-1 overflow-auto"
      style={{ background: 'var(--felt)' }}
    >
      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(var(--board-grid) 1px, transparent 1px), linear-gradient(90deg, var(--board-grid) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div
        className="sticky top-0 z-[6] flex flex-wrap items-center gap-1.5 px-5 py-3"
        style={{ background: 'var(--felt)' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '.15em',
            textTransform: 'uppercase',
            color: 'var(--board-lbl)'
          }}
        >
          {notes.length} of {totalCount} on board
        </span>
      </div>

      <div
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
              Nothing on the board matches that.
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.05em', opacity: 0.7 }}>
              Clear a filter, or pin a new capture.
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              snapGrid={snapGrid}
              onPositionChange={onPositionChange}
              onBringToFront={onBringToFront}
            />
          ))
        )}
      </div>
    </main>
  )
}
