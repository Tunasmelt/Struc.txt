'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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
  onToggleRail: () => void
  guestMode: boolean
  onExitGuest: () => void
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
  onExport,
  onToggleRail,
  guestMode,
  onExitGuest
}: TopbarProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  return (
    <div
      className="flex items-center gap-2 md:gap-3.5 px-3 md:px-[18px] border-b flex-wrap md:flex-nowrap"
      style={{
        background: 'var(--chrome)',
        borderColor: 'var(--chrome-line)',
        // min- not a fixed height: the old fixed height + flex-wrap combo
        // clipped/overlapped anything that wrapped to a second line
        // instead of growing to fit it — a real bug on any viewport narrow
        // enough to wrap, not just mobile.
        minHeight: 'var(--topbar-h)',
        padding: '8px 12px'
      }}
    >
      {/* Rail toggle — mobile/tablet only; the rail is a fixed-width column
          on desktop (md:) but an overlay drawer below that, since a 236px
          column would eat most of a phone screen otherwise. */}
      <button
        onClick={onToggleRail}
        aria-label="Toggle notes menu"
        title="Notes menu"
        className="md:hidden nf-btn grid place-items-center rounded flex-none"
        style={{ width: 34, height: 34, border: '1px solid var(--chrome-line)', color: 'var(--chalk)' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Logo — links back to the marketing/landing page */}
      <Link
        href="/"
        title="Back to Struc.txt home"
        className="flex items-center gap-2 pr-2 md:pr-4 md:border-r h-full flex-none"
        style={{ borderColor: 'var(--chrome-line)' }}
      >
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
        <b className="hidden sm:inline" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '19px', letterSpacing: '-.03em' }}>
          Struc<i style={{ fontStyle: 'normal', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '16px', color: 'var(--brass-text)' }}>.txt</i>
        </b>
        <span className="hidden md:inline" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--chalk-dim)' }}>
          board
        </span>
      </Link>

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

      {/* Everything below is desktop/tablet-only (md:) inline, and folded
          into the "More" menu below that on mobile — a phone-width topbar
          can't fit appearance + theme + snap + stack/arrange/restore +
          help + export + logout in one row without wrapping (which, given
          the fixed-height bug above, used to clip/overlap). */}
      <div className="hidden md:flex items-center gap-3.5 flex-none">
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
      </div>

      <div className="hidden md:block flex-1" />

      <div className="hidden md:flex items-center gap-3.5 flex-none">
        {/* Log out — was missing entirely: nothing anywhere in the app called
            the existing /auth/logout route handler, so there was no way to
            sign out or leave the board short of clearing cookies by hand.
            A guest has no Supabase session for that route to touch, so
            guest mode gets its own exit (clears the guest cookie only —
            local notes stay put in case they come back). */}
        {guestMode ? (
          <span className="flex items-center gap-2">
            <span
              title="Notes on this board are stored only in this browser and are never synced to an account."
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--brass-text)',
                border: '1px solid var(--brass)',
                borderRadius: 99,
                padding: '3px 9px'
              }}
            >
              Guest
            </span>
            <button type="button" onClick={onExitGuest} title="Exit guest mode" className="nf-btn px-3 py-1.5 text-sm rounded" style={btnBase}>
              Sign in
            </button>
          </span>
        ) : (
          <form action="/auth/logout" method="post" className="flex-none">
            <button type="submit" title="Log out" className="nf-btn px-3 py-1.5 text-sm rounded" style={btnBase}>
              Log out
            </button>
          </form>
        )}

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
      </div>

      {/* "More" menu — mobile/tablet only, contains everything folded out
          of the row above */}
      <div className="md:hidden relative flex-none ml-auto" ref={moreRef}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMoreOpen((o) => !o)
          }}
          aria-label="More options"
          title="More options"
          className="nf-btn grid place-items-center rounded"
          style={{ width: 34, height: 34, border: '1px solid var(--chrome-line)', color: 'var(--chalk)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="3" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="13" cy="8" r="1.3" fill="currentColor" /></svg>
        </button>
        {moreOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              zIndex: 80,
              minWidth: 220,
              maxHeight: '70vh',
              overflowY: 'auto',
              background: 'var(--chrome-2)',
              border: '1px solid var(--chrome-line)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-menu)',
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div role="group" aria-label="Appearance" className="flex border rounded overflow-hidden" style={{ borderColor: 'var(--chrome-line)', borderRadius: 8 }}>
              <button
                onClick={() => onAppearanceChange('light')}
                className="flex-1 px-3 py-1.5 text-sm"
                style={{ background: appearance === 'light' ? 'var(--hover)' : 'transparent', color: appearance === 'light' ? 'var(--chalk)' : 'var(--muted)' }}
              >
                Light
              </button>
              <button
                onClick={() => onAppearanceChange('dark')}
                className="flex-1 px-3 py-1.5 text-sm"
                style={{ background: appearance === 'dark' ? 'var(--hover)' : 'transparent', color: appearance === 'dark' ? 'var(--chalk)' : 'var(--muted)' }}
              >
                Dark
              </button>
            </div>

            <select
              aria-label="Board theme"
              value={boardTheme}
              onChange={(e) => onBoardThemeChange(e.target.value as keyof typeof BOARD_THEMES)}
              className="rounded-lg px-2 py-1.5 text-sm w-full"
              style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome)', color: 'var(--chalk)' }}
            >
              {Object.entries(BOARD_THEMES).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--chalk-dim)' }}>
              <input type="checkbox" checked={snapGrid} onChange={(e) => onSnapGridChange(e.target.checked)} style={{ accentColor: 'var(--brass)' }} />
              Snap to grid
            </label>

            <div style={{ height: 1, background: 'var(--chrome-line)' }} />

            <button className="nf-ctx-item" onClick={() => { setMoreOpen(false); onToggleStack() }} style={{ textAlign: 'left', padding: '7px 4px', fontSize: 13, color: stacked ? 'var(--brass-text)' : 'var(--chalk)' }}>
              {stacked ? 'Unstack' : 'Stack all'}
            </button>
            <button className="nf-ctx-item" onClick={() => { setMoreOpen(false); onAutoArrange() }} style={{ textAlign: 'left', padding: '7px 4px', fontSize: 13, color: 'var(--chalk)' }}>
              Auto-arrange
            </button>
            {hasSnapshot && (
              <button className="nf-ctx-item" onClick={() => { setMoreOpen(false); onRestore() }} style={{ textAlign: 'left', padding: '7px 4px', fontSize: 13, color: 'var(--chalk)' }}>
                Restore layout
              </button>
            )}

            <div style={{ height: 1, background: 'var(--chrome-line)' }} />

            <button className="nf-ctx-item" onClick={() => { setMoreOpen(false); onToggleHelp() }} style={{ textAlign: 'left', padding: '7px 4px', fontSize: 13, color: 'var(--chalk)' }}>
              Keyboard shortcuts
            </button>
            {[
              { fmt: 'image' as const, label: 'Export image (.png)' },
              { fmt: 'md' as const, label: 'Export markdown (.md)' },
              { fmt: 'txt' as const, label: 'Export text (.txt)' },
              { fmt: 'pdf' as const, label: 'Export PDF — coming soon' }
            ].map((it) => (
              <button
                key={it.fmt}
                className="nf-ctx-item"
                onClick={() => {
                  setMoreOpen(false)
                  onExport(it.fmt)
                }}
                style={{ textAlign: 'left', padding: '7px 4px', fontSize: 13, color: 'var(--chalk)' }}
              >
                {it.label}
              </button>
            ))}

            <div style={{ height: 1, background: 'var(--chrome-line)' }} />

            {guestMode ? (
              <button
                type="button"
                onClick={onExitGuest}
                className="nf-ctx-item"
                style={{ width: '100%', textAlign: 'left', padding: '7px 4px', fontSize: 13, color: 'var(--danger-fg)' }}
              >
                Sign in (exit guest mode)
              </button>
            ) : (
              <form action="/auth/logout" method="post">
                <button type="submit" className="nf-ctx-item" style={{ width: '100%', textAlign: 'left', padding: '7px 4px', fontSize: 13, color: 'var(--danger-fg)' }}>
                  Log out
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* New Capture — always visible, primary action */}
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
