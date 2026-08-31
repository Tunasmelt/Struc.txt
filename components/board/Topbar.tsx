'use client'

import { useEffect, useRef, useState } from 'react'
import { AppearanceMode, BOARD_THEMES, BoardTheme } from '@/lib/tokens'

interface TopbarProps {
  appearance: AppearanceMode
  onAppearanceChange: (mode: AppearanceMode) => void
  boardTheme: BoardTheme
  onBoardThemeChange: (theme: BoardTheme) => void
  snapGrid: boolean
  onSnapGridChange: (enabled: boolean) => void
  query: string
  onQueryChange: (query: string) => void
  onOpenCapture: () => void
  stacked: boolean
  hasSnapshot: boolean
  onToggleStack: () => void
  onAutoArrange: () => void
  onRestore: () => void
  onToggleHelp: () => void
  onExport: (fmt: 'image' | 'md' | 'txt' | 'pdf') => void
}

const btnBase = {
  border: '1px solid var(--chrome-line)',
  borderRadius: 8,
  padding: '8px 13px',
  fontWeight: 600 as const,
  fontSize: 13,
  background: 'var(--chrome-2)',
  color: 'var(--chalk)',
  transition: 'var(--t-btn)',
  whiteSpace: 'nowrap' as const,
  flex: 'none' as const
}

export default function Topbar({
  appearance,
  onAppearanceChange,
  boardTheme,
  onBoardThemeChange,
  snapGrid,
  onSnapGridChange,
  query,
  onQueryChange,
  onOpenCapture,
  stacked,
  hasSnapshot,
  onToggleStack,
  onAutoArrange,
  onRestore,
  onToggleHelp,
  onExport
}: TopbarProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  return (
    <div
      className="flex items-center gap-3.5 px-[18px] h-[60px] border-b flex-wrap"
      style={{
        background: 'var(--chrome)',
        borderColor: 'var(--chrome-line)',
        height: 'var(--topbar-h)',
        padding: 'var(--topbar-pad)'
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 pr-4 border-r h-full flex-none" style={{ borderColor: 'var(--chrome-line)' }}>
        <span
          className="grid place-items-center w-[26px] h-[26px] border rounded flex-none"
          style={{
            borderColor: 'var(--card-line)',
            borderRadius: '7px',
            background: 'var(--card-bg)'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 3.5h6.5M3 7h10M3 10.5h5" stroke="var(--ink-2)" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="10.5" y="9.2" width="2.6" height="3.6" rx="0.5" fill="var(--brass)" />
          </svg>
        </span>
        <b style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '19px', letterSpacing: '-.03em' }}>
          Struc<i style={{ fontStyle: 'normal', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '16px', color: 'var(--brass-text)' }}>.txt</i>
        </b>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--chalk-dim)' }}>
          board
        </span>
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[120px] max-w-[300px]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          className="absolute left-[11px] top-1/2 -translate-y-1/2 opacity-50"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          placeholder="Search notes"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full px-9 py-2 rounded"
          style={{
            background: 'var(--chrome-2)',
            border: '1px solid var(--chrome-line)',
            color: 'var(--chalk)'
          }}
        />
      </div>

      {/* Appearance Toggle */}
      <div className="flex gap-1.5 items-center flex-none" role="group" aria-label="Appearance">
        <div className="flex border rounded overflow-hidden" style={{ borderColor: 'var(--chrome-line)', borderRadius: '8px' }}>
          <button
            onClick={() => onAppearanceChange('light')}
            className="px-3 py-1.5 text-sm transition-colors"
            style={{
              background: appearance === 'light' ? 'var(--hover)' : 'transparent',
              color: appearance === 'light' ? 'var(--chalk)' : 'var(--muted)'
            }}
          >
            Light
          </button>
          <button
            onClick={() => onAppearanceChange('dark')}
            className="px-3 py-1.5 text-sm transition-colors"
            style={{
              background: appearance === 'dark' ? 'var(--hover)' : 'transparent',
              color: appearance === 'dark' ? 'var(--chalk)' : 'var(--muted)'
            }}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Board theme — cosmetic surface only; template pin/stock colors are
          fixed and untouched by this, see lib/tokens.ts BOARD_THEMES */}
      <select
        aria-label="Board theme"
        title="Board theme"
        value={boardTheme}
        onChange={(e) => onBoardThemeChange(e.target.value as keyof typeof BOARD_THEMES)}
        className="flex-none rounded-lg px-2 py-1.5 text-sm"
        style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome-2)', color: 'var(--chalk)' }}
      >
        {Object.entries(BOARD_THEMES).map(([key, t]) => (
          <option key={key} value={key}>
            {t.label}
          </option>
        ))}
      </select>

      {/* Snap Grid */}
      <label className="flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: 'var(--chalk-dim)' }}>
        <input
          type="checkbox"
          checked={snapGrid}
          onChange={(e) => onSnapGridChange(e.target.checked)}
          style={{ accentColor: 'var(--brass)' }}
        />
        Snap
      </label>

      <div className="w-px h-[26px] flex-none" style={{ background: 'var(--chrome-line)' }} />

      {/* Board Controls */}
      <div className="flex gap-1.5 items-center flex-none">
        <button
          className="nf-btn px-3 py-1.5 text-sm rounded"
          onClick={onToggleStack}
          style={{
            border: `1px solid ${stacked ? 'var(--brass)' : 'var(--chrome-line)'}`,
            color: stacked ? 'var(--brass-text)' : 'var(--chalk)'
          }}
        >
          {stacked ? 'Unstack' : 'Stack all'}
        </button>
        <button className="nf-btn px-3 py-1.5 text-sm rounded" onClick={onAutoArrange} style={{ border: '1px solid var(--chrome-line)', color: 'var(--chalk)' }}>
          Auto-arrange
        </button>
        {hasSnapshot && (
          <button className="nf-btn px-3 py-1.5 text-sm rounded" onClick={onRestore} style={{ border: '1px solid var(--chrome-line)', color: 'var(--chalk)' }}>
            Restore
          </button>
        )}
      </div>

      <div className="flex-1" />

      {/* Help */}
      <button
        title="Keyboard shortcuts"
        aria-label="Keyboard shortcuts"
        onClick={onToggleHelp}
        className="nf-btn px-3 py-1.5 text-sm rounded"
        style={{ ...btnBase, fontFamily: 'var(--font-mono)' }}
      >
        ?
      </button>

      {/* Export */}
      <div className="relative flex-none" ref={exportRef}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExportOpen((o) => !o)
          }}
          className="nf-btn px-3 py-1.5 text-sm rounded"
          style={btnBase}
        >
          Export ▾
        </button>
        {exportOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              zIndex: 80,
              minWidth: 190,
              background: 'var(--chrome-2)',
              border: '1px solid var(--chrome-line)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-menu)',
              padding: 5
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--muted)', padding: '7px 10px 3px' }}>
              Export visible notes
            </div>
            {[
              { fmt: 'image' as const, label: 'Image (.png)' },
              { fmt: 'md' as const, label: 'Markdown (.md)' },
              { fmt: 'txt' as const, label: 'Plain text (.txt)' },
              { fmt: 'pdf' as const, label: 'PDF — coming soon' }
            ].map((it) => (
              <button
                key={it.fmt}
                className="nf-ctx-item"
                onClick={() => {
                  setExportOpen(false)
                  onExport(it.fmt)
                }}
                style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 9, padding: '8px 10px', fontSize: 13, borderRadius: 6, textAlign: 'left', color: 'var(--chalk)' }}
              >
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Capture */}
      <button
        onClick={onOpenCapture}
        className="px-3 py-2 font-semibold text-sm rounded transition-colors whitespace-nowrap flex-none hover:bg-[var(--brass-hi)] hover:border-[var(--brass-hi)]"
        style={{
          border: '1px solid var(--brass)',
          borderRadius: '8px',
          background: 'var(--brass)',
          color: 'var(--brass-ink)',
          transition: 'var(--t-btn)'
        }}
      >
        New capture
      </button>
    </div>
  )
}
