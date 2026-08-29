'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Topbar from '@/components/board/Topbar'
import Rail from '@/components/board/Rail'
import Board from '@/components/board/Board'
import CaptureModal from '@/components/board/CaptureModal'
import { getNotes, updateNotePosition } from '@/app/actions/notes'
import { AppearanceMode, TemplateType } from '@/lib/tokens'
import { BoardNote, RawNote, enrichNote } from '@/components/board/types'

export default function BoardPage() {
  const [appearance, setAppearance] = useState<AppearanceMode>('light')
  const [snapGrid, setSnapGrid] = useState(false)
  const [query, setQuery] = useState('')
  const [filterTmpl, setFilterTmpl] = useState<TemplateType | null>(null)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [notes, setNotes] = useState<BoardNote[]>([])
  const [loading, setLoading] = useState(true)
  const [zTop, setZTop] = useState(10)

  const loadNotes = useCallback(async () => {
    try {
      const data = (await getNotes()) as RawNote[]
      const enriched = data.map(enrichNote)
      setNotes(enriched)
      const maxZ = enriched.reduce((max, n) => Math.max(max, n.position.z_index ?? 0), 0)
      setZTop((prev) => Math.max(prev, maxZ))
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const toggleAppearance = (mode: AppearanceMode) => {
    setAppearance(mode)
    document.documentElement.setAttribute('data-mode', mode)
  }

  const persistPosition = useCallback((id: string, position: { x: number; y: number; rotation: number; z_index: number }) => {
    updateNotePosition(id, position).catch((error) => {
      console.error(`Failed to persist position for note ${id}:`, error)
    })
  }, [])

  const handlePositionChange = useCallback(
    (id: string, position: { x: number; y: number }) => {
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n
          const nextPosition = { ...n.position, x: position.x, y: position.y }
          persistPosition(id, nextPosition)
          return { ...n, position: nextPosition }
        })
      )
    },
    [persistPosition]
  )

  const handleBringToFront = useCallback(
    (id: string) => {
      const next = zTop + 1
      setZTop(next)
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n
          const nextPosition = { ...n.position, z_index: next }
          persistPosition(id, nextPosition)
          return { ...n, position: nextPosition }
        })
      )
    },
    [zTop, persistPosition]
  )

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (filterTmpl && note.tmpl !== filterTmpl) return false
      if (query) {
        const haystack = [note.title || '', note.raw_text, JSON.stringify(note.latestVersion?.body || {})]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(query.toLowerCase())) return false
      }
      return true
    })
  }, [notes, filterTmpl, query])

  return (
    <div
      className="flex h-screen w-screen flex-col"
      style={{ fontFamily: 'var(--font-body)', background: 'var(--chrome)', color: 'var(--chalk)' }}
    >
      <Topbar
        appearance={appearance}
        onAppearanceChange={toggleAppearance}
        snapGrid={snapGrid}
        onSnapGridChange={setSnapGrid}
        query={query}
        onQueryChange={setQuery}
        onOpenCapture={() => setCaptureOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Rail notes={notes} filterTmpl={filterTmpl} onFilterTmplChange={setFilterTmpl} />
        <Board
          notes={filteredNotes}
          totalCount={notes.length}
          loading={loading}
          snapGrid={snapGrid}
          onPositionChange={handlePositionChange}
          onBringToFront={handleBringToFront}
        />
      </div>

      <CaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} onCreated={loadNotes} />
    </div>
  )
}
