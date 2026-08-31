'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Topbar from '@/components/board/Topbar'
import Rail from '@/components/board/Rail'
import Board, { SortKey } from '@/components/board/Board'
import CaptureModal from '@/components/board/CaptureModal'
import Drawer from '@/components/board/Drawer'
import ContextMenu from '@/components/board/ContextMenu'
import ConfirmDeleteModal from '@/components/board/ConfirmDeleteModal'
import HelpModal from '@/components/board/HelpModal'
import Toast from '@/components/board/Toast'
import {
  getNotes,
  updateNotePosition,
  updateNoteFlags,
  deleteNote,
  duplicateNote,
  searchNoteIds,
  updateNoteTitle,
  updateNoteRawText,
  saveEditedNoteVersion
} from '@/app/actions/notes'
import { getTemplates } from '@/app/actions/templates'
import { confirmTag, rejectTag, toggleActionItem } from '@/app/actions/enrich'
import { AppearanceMode, BOARD_THEMES, BoardTheme, SPACE } from '@/lib/tokens'
import { BoardNote, RawNote, ResolvedTemplate, checklistFor, enrichNote, tagsFor, toResolvedTemplate } from '@/components/board/types'
import { exportElementAsImage, exportNotesAsMarkdown, exportNotesAsText } from '@/lib/board/exportNote'

const APPEARANCE_KEY = 'noteflow-board-appearance'
const THEME_KEY = 'noteflow-board-theme'

export default function BoardPage() {
  const [appearance, setAppearanceState] = useState<AppearanceMode>('light')
  const [boardTheme, setBoardThemeState] = useState<BoardTheme>('felt')
  const [snapGrid, setSnapGrid] = useState(false)
  // The rail is a fixed-width static column on desktop but an overlay
  // drawer below md: (a 236px column would eat most of a phone screen).
  const [mobileRailOpen, setMobileRailOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filterTmpl, setFilterTmpl] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [filterRange, setFilterRange] = useState<number | null>(null)
  const [sort, setSort] = useState<SortKey>('recent')
  const [showArchived, setShowArchived] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [notes, setNotes] = useState<BoardNote[]>([])
  const [templates, setTemplates] = useState<ResolvedTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [zTop, setZTop] = useState(10)

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [widths, setWidths] = useState<Record<string, number>>({})
  const [checklistOverrides, setChecklistOverrides] = useState<Record<string, boolean>>({})

  const [stacked, setStacked] = useState(false)
  const [snapshot, setSnapshot] = useState<Record<string, { x: number; y: number; w: number }> | null>(null)

  const [openId, setOpenId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [ctx, setCtx] = useState<{ id: string; x: number; y: number } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; undo: (() => void) | null }>({ message: '', undo: null })

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mousePos = useRef({ x: 0, y: 0 })

  /* ---------- full-text search (Phase 5) ----------
   * `query` drives real Postgres full-text search (searchNoteIds, via the
   * notes.search tsvector-backed column) rather than a naive client-side
   * substring check, debounced so we're not round-tripping per keystroke.
   * `null` means "no active query" (or results not back yet) — matches()
   * treats null as "don't filter on query yet" so the board doesn't flash
   * to empty while a search is in flight. */
  const [queryMatchIds, setQueryMatchIds] = useState<Set<string> | null>(null)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    const trimmed = query.trim()
    if (!trimmed) {
      setQueryMatchIds(null)
      return
    }
    searchDebounce.current = setTimeout(() => {
      searchNoteIds(trimmed)
        .then((ids) => setQueryMatchIds(new Set(ids)))
        .catch((err) => console.error('Search failed:', err))
    }, 250)
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current)
    }
  }, [query])

  const showToast = useCallback((message: string, undo?: () => void) => {
    setToast({ message, undo: undo ?? null })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast({ message: '', undo: null }), undo ? 5000 : 2400)
  }, [])

  /* ---------- appearance ---------- */
  useEffect(() => {
    const saved = (typeof window !== 'undefined' && (localStorage.getItem(APPEARANCE_KEY) as AppearanceMode | null)) || 'dark'
    setAppearanceState(saved)
    document.documentElement.setAttribute('data-mode', saved)
  }, [])

  const setAppearance = (mode: AppearanceMode) => {
    setAppearanceState(mode)
    document.documentElement.setAttribute('data-mode', mode)
    try {
      localStorage.setItem(APPEARANCE_KEY, mode)
    } catch {
      // ignore (private browsing, etc.)
    }
  }

  /* ---------- board theme (Phase 9 — cosmetic surface only, template
   * pin/stock colors are untouched by this) ----------
   * Only --felt/--felt-2 (the board canvas itself) are set here, as inline
   * styles on the root element. --brass is deliberately NOT touched:
   * setting it here used to permanently override the [data-mode="light"]/
   * [data-mode="dark"] CSS rules for that variable (an inline style always
   * wins over an attribute-selector rule), which is exactly why the
   * topbar/rail's brass-accented buttons and active states stopped
   * reacting to the light/dark toggle once a theme had been applied - a
   * real bug, not a hypothetical, reported directly by the user. --brass
   * stays governed entirely by the appearance mode, same as every other
   * mode-aware token. */
  const applyBoardThemeVars = (theme: BoardTheme) => {
    const t = BOARD_THEMES[theme]
    const root = document.documentElement
    root.style.setProperty('--felt', t.felt)
    root.style.setProperty('--felt-2', t.felt2)
    root.setAttribute('data-theme', theme)
  }

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && (localStorage.getItem(THEME_KEY) as BoardTheme | null)) || 'felt'
    setBoardThemeState(saved)
    applyBoardThemeVars(saved)
  }, [])

  const setBoardTheme = (theme: BoardTheme) => {
    setBoardThemeState(theme)
    applyBoardThemeVars(theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore (private browsing, etc.)
    }
  }

  /* ---------- data loading ---------- */
  const loadNotes = useCallback(async () => {
    try {
      const [data, templateRows] = await Promise.all([getNotes() as Promise<RawNote[]>, getTemplates()])
      const resolvedTemplates = templateRows.map(toResolvedTemplate)
      const templatesById = Object.fromEntries(resolvedTemplates.map((t) => [t.id, t]))
      setTemplates(resolvedTemplates)
      const enriched = data.map((n) => enrichNote(n, templatesById))
      setNotes(enriched)
      setWidths((prev) => {
        const next = { ...prev }
        enriched.forEach((n) => {
          if (!(n.id in next)) next[n.id] = SPACE.noteW
        })
        return next
      })
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

  /* ---------- position / z-order ---------- */
  const persistPosition = useCallback((id: string, position: { x: number; y: number; rotation: number; z_index: number }) => {
    updateNotePosition(id, position).catch((error) => {
      console.error(`Failed to persist position for note ${id}:`, error)
    })
  }, [])

  // Note on the pattern below: persistPosition (and every position-mutating
  // callback in this file) must never be called *inside* a setNotes updater
  // function. React can invoke that updater during another component's
  // render, so a side effect there (a Server Action call, which eventually
  // touches router-visible cache state via revalidatePath) can fire mid-
  // render and throw "Cannot update a component while rendering a different
  // component" - a real crash this project shipped with, not a
  // hypothetical. Fix: compute the new position from the current `notes`
  // closure first, call setNotes with a pure mapper, then persist as a
  // separate statement afterward.
  const handlePositionChange = useCallback(
    (id: string, position: { x: number; y: number }) => {
      const current = notes.find((n) => n.id === id)
      if (!current) return
      const nextPosition = { ...current.position, x: position.x, y: position.y }
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, position: nextPosition } : n)))
      persistPosition(id, nextPosition)
      if (stacked) setStacked(false)
    },
    [notes, persistPosition, stacked]
  )

  const bringToFront = useCallback(
    (id: string) => {
      const current = notes.find((n) => n.id === id)
      if (!current) return
      const next = zTop + 1
      const nextPosition = { ...current.position, z_index: next }
      setZTop(next)
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, position: nextPosition } : n)))
      persistPosition(id, nextPosition)
    },
    [notes, zTop, persistPosition]
  )

  /* ---------- filtering / sorting ---------- */
  const liveNotes = useMemo(() => notes.filter((n) => !n.archived), [notes])
  const archivedNotes = useMemo(() => notes.filter((n) => n.archived), [notes])

  const matches = useCallback(
    (n: BoardNote) => {
      if (n.archived !== showArchived) return false
      if (filterTmpl && n.tmpl?.id !== filterTmpl) return false
      if (filterTag && !tagsFor(n).includes(filterTag)) return false
      if (filterRange) {
        const days = (Date.now() - new Date(n.created_at).getTime()) / 864e5
        if (days > filterRange) return false
      }
      if (query.trim() && queryMatchIds && !queryMatchIds.has(n.id)) return false
      return true
    },
    [showArchived, filterTmpl, filterTag, filterRange, query, queryMatchIds]
  )

  const sortNotes = useCallback(
    (list: BoardNote[]) => {
      const sorted = [...list]
      sorted.sort((a, b) => {
        if (sort === 'title') return (a.title || '').localeCompare(b.title || '')
        if (sort === 'template') return (a.tmpl?.name || '').localeCompare(b.tmpl?.name || '')
        return b.created_at.localeCompare(a.created_at)
      })
      return sorted
    },
    [sort]
  )

  const visibleNotes = useMemo(() => sortNotes(notes.filter(matches)), [notes, matches, sortNotes])

  const rangeChips = [
    { key: '7', label: '7 days', active: filterRange === 7 },
    { key: '30', label: '30 days', active: filterRange === 30 }
  ]
  const allTags = useMemo(() => {
    const seen: string[] = []
    liveNotes.forEach((n) => tagsFor(n).forEach((t) => { if (!seen.includes(t)) seen.push(t) }))
    return seen.slice(0, 6)
  }, [liveNotes])
  const tagChips = allTags.map((t) => ({ key: t, label: `#${t}`, active: filterTag === t }))

  const countLabel = `${visibleNotes.length} of ${showArchived ? archivedNotes.length : liveNotes.length}${showArchived ? ' archived' : ' on board'}`

  /* ---------- pin / archive / duplicate / delete ---------- */
  const applyFlags = useCallback((id: string, patch: { pinned?: boolean; archived?: boolean }) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
    updateNoteFlags(id, patch).catch((err) => console.error('Failed to update note flags:', err))
  }, [])

  const togglePin = useCallback(
    (note: BoardNote) => {
      applyFlags(note.id, { pinned: !note.pinned })
      showToast(note.pinned ? 'Unpinned' : 'Pinned — stack and auto-arrange will skip it')
    },
    [applyFlags, showToast]
  )

  const toggleArchive = useCallback(
    (note: BoardNote) => {
      const wasArchived = note.archived
      applyFlags(note.id, { archived: !wasArchived })
      if (wasArchived) showToast('Restored to the board')
      else showToast('Archived', () => applyFlags(note.id, { archived: false }))
    },
    [applyFlags, showToast]
  )

  const handleDuplicate = useCallback(
    async (note: BoardNote) => {
      try {
        await duplicateNote(note.id)
        await loadNotes()
        showToast('Note duplicated')
      } catch (err) {
        console.error('Failed to duplicate note:', err)
        showToast('Could not duplicate that note')
      }
    },
    [loadNotes, showToast]
  )

  const handleDeleteConfirmed = useCallback(async () => {
    if (!confirmId) return
    const id = confirmId
    setConfirmId(null)
    try {
      await deleteNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (openId === id) {
        setOpenId(null)
        setDrawerOpen(false)
      }
      showToast('Note deleted — action items and versions removed')
    } catch (err) {
      console.error('Failed to delete note:', err)
      showToast('Could not delete that note')
    }
  }, [confirmId, openId, showToast])

  /* ---------- collapse / width (session-local) ---------- */
  const toggleCollapse = useCallback(
    (id: string) => {
      bringToFront(id)
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [bringToFront]
  )

  const setWidth = useCallback((id: string, w: number) => {
    setWidths((prev) => ({ ...prev, [id]: w }))
  }, [])

  /* ---------- stack / auto-arrange / restore ---------- */
  const takeSnapshot = useCallback(() => {
    const map: Record<string, { x: number; y: number; w: number }> = {}
    notes.forEach((n) => {
      map[n.id] = { x: n.position.x, y: n.position.y, w: widths[n.id] ?? SPACE.noteW }
    })
    setSnapshot(map)
  }, [notes, widths])

  const restoreLayout = useCallback(() => {
    if (!snapshot) return
    const updates: Record<string, BoardNote['position']> = {}
    notes.forEach((n) => {
      const s = snapshot[n.id]
      if (s) updates[n.id] = { ...n.position, x: s.x, y: s.y }
    })
    setNotes((prev) => prev.map((n) => (updates[n.id] ? { ...n, position: updates[n.id] } : n)))
    Object.entries(updates).forEach(([id, position]) => persistPosition(id, position))
    setWidths((prev) => {
      const next = { ...prev }
      Object.entries(snapshot).forEach(([id, s]) => {
        next[id] = s.w
      })
      return next
    })
    setSnapshot(null)
    setStacked(false)
    showToast('Layout restored')
  }, [snapshot, notes, persistPosition, showToast])

  const toggleStack = useCallback(() => {
    if (stacked) {
      restoreLayout()
      return
    }
    takeSnapshot()
    const order = sortNotes(notes.filter((n) => matches(n) && !n.pinned))
    const A = SPACE.stackAnchor
    const step = 4
    let z = zTop
    const updates: Record<string, BoardNote['position']> = {}
    order.forEach((n, idx) => {
      z += 1
      updates[n.id] = { ...n.position, x: A.x + idx * step, y: A.y + idx * step, z_index: z }
    })
    setNotes((prev) => prev.map((n) => (updates[n.id] ? { ...n, position: updates[n.id] } : n)))
    Object.entries(updates).forEach(([id, position]) => persistPosition(id, position))
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      order.forEach((n) => next.delete(n.id))
      return next
    })
    setZTop(z)
    setStacked(true)
    showToast(`Stacked ${order.length} notes`)
  }, [stacked, restoreLayout, takeSnapshot, sortNotes, notes, matches, zTop, persistPosition, showToast])

  const autoArrange = useCallback(() => {
    takeSnapshot()
    const boardEl = document.querySelector('[data-nf="board"]') as HTMLElement | null
    const width = boardEl ? boardEl.clientWidth : SPACE.boardMinW
    const colW = SPACE.noteW + SPACE.arrangeGap
    const cols = Math.max(1, Math.floor((width - 40) / colW))
    const order = sortNotes(notes.filter((n) => matches(n) && !n.pinned))
    let z = zTop
    const updates: Record<string, BoardNote['position']> = {}
    order.forEach((n, idx) => {
      z += 1
      const x = 20 + (idx % cols) * colW
      const y = 10 + Math.floor(idx / cols) * SPACE.arrangeRowH
      updates[n.id] = { ...n.position, x, y, z_index: z }
    })
    setNotes((prev) => prev.map((n) => (updates[n.id] ? { ...n, position: updates[n.id] } : n)))
    Object.entries(updates).forEach(([id, position]) => persistPosition(id, position))
    setWidths((prev) => {
      const next = { ...prev }
      order.forEach((n) => {
        next[n.id] = SPACE.noteW
      })
      return next
    })
    setZTop(z)
    setStacked(false)
    showToast('Notes tidied into a grid')
  }, [takeSnapshot, sortNotes, notes, matches, zTop, persistPosition, showToast])

  /* ---------- drawer ---------- */
  const openNote = useCallback(
    (id: string) => {
      setOpenId(id)
      setDrawerOpen(true)
    },
    []
  )

  const openNoteObj = notes.find((n) => n.id === openId) || null

  const toggleChecklistItem = useCallback(
    (noteId: string, index: number) => {
      const note = notes.find((n) => n.id === noteId)
      const key = `${noteId}:${index}`
      const baseline = note ? checklistFor(note)[index]?.done ?? false : false
      setChecklistOverrides((prev) => {
        const current = key in prev ? prev[key] : baseline
        return { ...prev, [key]: !current }
      })
    },
    [notes]
  )

  /* ---------- Phase 7: real tags + action items (DB-backed, unlike
   * checklistOverrides above) ---------- */
  const handleToggleActionItem = useCallback((id: string, done: boolean) => {
    setNotes((prev) =>
      prev.map((n) => ({
        ...n,
        action_items: (n.action_items || []).map((a) => (a.id === id ? { ...a, status: done ? 'done' : 'pending' } : a))
      }))
    )
    toggleActionItem(id, done).catch((err) => {
      console.error('Failed to toggle action item:', err)
      loadNotes()
    })
  }, [loadNotes])

  const handleConfirmTag = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => ({
        ...n,
        note_tags: (n.note_tags || []).map((t) => (t.id === id ? { ...t, status: 'confirmed' } : t))
      }))
    )
    confirmTag(id).catch((err) => {
      console.error('Failed to confirm tag:', err)
      loadNotes()
    })
  }, [loadNotes])

  const handleRejectTag = useCallback((id: string) => {
    setNotes((prev) => prev.map((n) => ({ ...n, note_tags: (n.note_tags || []).filter((t) => t.id !== id) })))
    rejectTag(id).catch((err) => {
      console.error('Failed to reject tag:', err)
      loadNotes()
    })
  }, [loadNotes])

  /* ---------- editing: title, raw text, structured fields ---------- */
  const handleEditTitle = useCallback((id: string, title: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n)))
    updateNoteTitle(id, title).catch((err) => {
      console.error('Failed to update note title:', err)
      loadNotes()
    })
  }, [loadNotes])

  const handleEditRawText = useCallback(
    async (id: string, rawText: string) => {
      try {
        await updateNoteRawText(id, rawText)
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, raw_text: rawText } : n)))
        showToast('Raw capture updated')
      } catch (err) {
        console.error('Failed to update raw text:', err)
        showToast('Could not update raw capture')
      }
    },
    [showToast]
  )

  // Saves an edited structured field set as a NEW note_versions row (never
  // an in-place update — same insert-only rule Phase 8's re-run already
  // follows), then reloads so the note picks up its new latestVersion.
  const handleSaveEditedFields = useCallback(
    async (id: string, templateId: string | null, body: Record<string, unknown>) => {
      try {
        await saveEditedNoteVersion(id, templateId, body)
        await loadNotes()
        showToast('Note updated')
      } catch (err) {
        console.error('Failed to save edited fields:', err)
        showToast('Could not save changes')
      }
    },
    [loadNotes, showToast]
  )

  /* ---------- export ---------- */
  const handleExport = useCallback(
    async (fmt: 'image' | 'md' | 'txt' | 'pdf') => {
      if (!visibleNotes.length) {
        showToast('Nothing visible to export — clear a filter first')
        return
      }
      if (fmt === 'md') exportNotesAsMarkdown(visibleNotes)
      else if (fmt === 'txt') exportNotesAsText(visibleNotes)
      else if (fmt === 'pdf') showToast('PDF export — coming soon')
      else {
        const board = document.querySelector('[data-nf="board"]') as HTMLElement | null
        if (!board) {
          showToast('Image export unavailable here')
          return
        }
        showToast('Rendering board image…')
        try {
          const bg = getComputedStyle(document.documentElement).getPropertyValue('--felt').trim()
          await exportElementAsImage(board, 'noteflow-board.png', bg)
          showToast('Board image downloaded')
        } catch {
          showToast('Image export failed in this environment')
        }
      }
    },
    [visibleNotes, showToast]
  )

  const exportNoteImage = useCallback(
    async (note: BoardNote) => {
      const el = document.querySelector(`[data-note="${note.id}"]`) as HTMLElement | null
      if (!el) {
        showToast("Note isn't visible on the board right now")
        return
      }
      showToast('Rendering note image…')
      try {
        await exportElementAsImage(el, `noteflow-${note.id}.png`, null)
        showToast('Note image downloaded')
      } catch {
        showToast('Image export failed in this environment')
      }
    },
    [showToast]
  )

  /* ---------- dismiss context menu on outside click ---------- */
  useEffect(() => {
    if (!ctx) return
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest?.('[data-nf="ctx"]')) setCtx(null)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [ctx])

  /* ---------- keyboard shortcuts ---------- */
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }
    }
    document.addEventListener('mousemove', onMouseMove)
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [])

  const shortcutTarget = useCallback((): BoardNote | null => {
    const hit = document.elementFromPoint(mousePos.current.x, mousePos.current.y)
    let el = hit?.closest?.('[data-note]') as HTMLElement | null
    if (!el) {
      const active = document.activeElement
      el = active?.closest?.('[data-note]') as HTMLElement | null
    }
    if (!el) return null
    const id = el.getAttribute('data-note')
    return notes.find((n) => n.id === id) || null
  }, [notes])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target as HTMLElement)?.isContentEditable) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur()
        return
      }
      if (e.key === 'Escape') {
        setCaptureOpen(false)
        setDrawerOpen(false)
        setCtx(null)
        setConfirmId(null)
        setHelpOpen(false)
        return
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault()
        setHelpOpen((o) => !o)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const n = shortcutTarget()
      if (!n) return
      const k = e.key.toLowerCase()

      if (k === 'c') {
        e.preventDefault()
        toggleCollapse(n.id)
      } else if (k === 'p') {
        e.preventDefault()
        togglePin(n)
      } else if (k === 'a') {
        e.preventDefault()
        toggleArchive(n)
      } else if (k === 'f') {
        e.preventDefault()
        bringToFront(n.id)
      } else if (k === 'o' || e.key === 'Enter') {
        e.preventDefault()
        openNote(n.id)
      } else if (e.key === ']' || k === '=' || k === '+') {
        e.preventDefault()
        setWidth(n.id, Math.min(SPACE.noteWMax, (widths[n.id] ?? SPACE.noteW) + 20))
      } else if (e.key === '[' || k === '-') {
        e.preventDefault()
        setWidth(n.id, Math.max(SPACE.noteWMin, (widths[n.id] ?? SPACE.noteW) - 20))
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        setConfirmId(n.id)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [shortcutTarget, toggleCollapse, togglePin, toggleArchive, bringToFront, openNote, setWidth, widths])

  const ctxNote = ctx ? notes.find((n) => n.id === ctx.id) || null : null

  return (
    <div
      className="flex h-screen w-screen flex-col"
      style={{ fontFamily: 'var(--font-body)', background: 'var(--chrome)', color: 'var(--chalk)' }}
    >
      <Topbar
        appearance={appearance}
        onAppearanceChange={setAppearance}
        snapGrid={snapGrid}
        onSnapGridChange={setSnapGrid}
        query={query}
        onQueryChange={setQuery}
        onOpenCapture={() => setCaptureOpen(true)}
        stacked={stacked}
        hasSnapshot={!!snapshot}
        onToggleStack={toggleStack}
        onAutoArrange={autoArrange}
        onRestore={restoreLayout}
        onToggleHelp={() => setHelpOpen((o) => !o)}
        onExport={handleExport}
        boardTheme={boardTheme}
        onBoardThemeChange={setBoardTheme}
        onToggleRail={() => setMobileRailOpen((o) => !o)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Backdrop — mobile only, closes the rail drawer on tap-outside */}
        {mobileRailOpen && (
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(8,7,6,.6)' }}
            onClick={() => setMobileRailOpen(false)}
          />
        )}
        <Rail
          liveNotes={liveNotes}
          archivedCount={archivedNotes.length}
          templates={templates}
          filterTmpl={filterTmpl}
          onFilterTmplChange={(id) => {
            setFilterTmpl(id)
            setMobileRailOpen(false)
          }}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
          onToggleActionItem={handleToggleActionItem}
          className={`${mobileRailOpen ? 'flex' : 'hidden'} md:flex fixed md:static inset-y-0 left-0 z-50 md:z-auto flex-col`}
        />
        <Board
          notes={visibleNotes}
          loading={loading}
          snapGrid={snapGrid}
          stacked={stacked}
          collapsedIds={collapsedIds}
          widths={widths}
          showArchived={showArchived}
          rangeChips={rangeChips}
          onRangeChange={(key) => setFilterRange((prev) => (String(prev) === key ? null : Number(key)))}
          tagChips={tagChips}
          onTagChange={(key) => setFilterTag((prev) => (prev === key ? null : key))}
          sort={sort}
          onSortChange={setSort}
          countLabel={countLabel}
          onPositionChange={handlePositionChange}
          onBringToFront={bringToFront}
          onCollapseToggle={toggleCollapse}
          onResize={setWidth}
          onOpen={openNote}
          onContextMenu={(id, x, y) => setCtx({ id, x, y })}
          onToggleActionItem={handleToggleActionItem}
          onConfirmTag={handleConfirmTag}
          onRejectTag={handleRejectTag}
          onEditTitle={handleEditTitle}
        />
      </div>

      <CaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} onCreated={loadNotes} templates={templates} />

      <Drawer
        note={openNoteObj}
        open={drawerOpen}
        templates={templates}
        onClose={() => setDrawerOpen(false)}
        onPin={() => openNoteObj && togglePin(openNoteObj)}
        onArchive={() => openNoteObj && toggleArchive(openNoteObj)}
        onDuplicate={() => openNoteObj && handleDuplicate(openNoteObj)}
        onExportImage={() => openNoteObj && exportNoteImage(openNoteObj)}
        onReran={loadNotes}
        checklistOverrides={checklistOverrides}
        onToggleChecklistItem={toggleChecklistItem}
        onToggleActionItem={handleToggleActionItem}
        onConfirmTag={handleConfirmTag}
        onRejectTag={handleRejectTag}
        onEditTitle={handleEditTitle}
        onEditRawText={handleEditRawText}
        onSaveEditedFields={handleSaveEditedFields}
      />

      {ctxNote && (
        <ContextMenu
          note={ctxNote}
          x={ctx!.x}
          y={ctx!.y}
          onClose={() => setCtx(null)}
          onBringToFront={() => bringToFront(ctxNote.id)}
          onTogglePin={() => togglePin(ctxNote)}
          collapsed={collapsedIds.has(ctxNote.id)}
          onToggleCollapse={() => toggleCollapse(ctxNote.id)}
          onDuplicate={() => handleDuplicate(ctxNote)}
          onExportImage={() => exportNoteImage(ctxNote)}
          onArchive={() => toggleArchive(ctxNote)}
          onDelete={() => setConfirmId(ctxNote.id)}
        />
      )}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ConfirmDeleteModal open={!!confirmId} onCancel={() => setConfirmId(null)} onConfirm={handleDeleteConfirmed} />
      <Toast message={toast.message} onUndo={toast.undo} />
    </div>
  )
}
