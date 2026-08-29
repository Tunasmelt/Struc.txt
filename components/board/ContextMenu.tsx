'use client'

import type { CSSProperties } from 'react'
import { BoardNote } from './types'

interface ContextMenuProps {
  note: BoardNote
  x: number
  y: number
  onClose: () => void
  onBringToFront: () => void
  onTogglePin: () => void
  onToggleCollapse: (collapsed: boolean) => void
  collapsed: boolean
  onDuplicate: () => void
  onExportImage: () => void
  onArchive: () => void
  onDelete: () => void
}

const itemStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
  gap: 12,
  alignItems: 'center',
  padding: '8px 10px',
  fontSize: 13,
  textAlign: 'left',
  borderRadius: 6,
  color: 'var(--chalk)'
}

export default function ContextMenu({
  note,
  x,
  y,
  onClose,
  onBringToFront,
  onTogglePin,
  onToggleCollapse,
  collapsed,
  onDuplicate,
  onExportImage,
  onArchive,
  onDelete
}: ContextMenuProps) {
  const items: { label: string; key: string; go: () => void; danger?: boolean }[] = [
    { label: 'Bring to front', key: 'F', go: () => { onBringToFront(); onClose() } },
    { label: note.pinned ? 'Unpin' : 'Pin in place', key: 'P', go: () => { onTogglePin(); onClose() } },
    { label: collapsed ? 'Expand card' : 'Collapse card', key: 'C', go: () => { onToggleCollapse(!collapsed); onClose() } },
    { label: 'Duplicate', key: 'D', go: () => { onDuplicate(); onClose() } },
    { label: 'Export as image', key: 'E', go: () => { onExportImage(); onClose() } },
    { label: note.archived ? 'Restore to board' : 'Archive', key: 'A', go: () => { onArchive(); onClose() } },
    { label: 'Delete note', key: '⌫', go: () => { onDelete(); onClose() }, danger: true }
  ]

  const left = typeof window !== 'undefined' ? Math.min(x, window.innerWidth - 230) : x
  const top = typeof window !== 'undefined' ? Math.min(y, window.innerHeight - 300) : y

  return (
    <div
      data-nf="ctx"
      style={{
        position: 'fixed',
        zIndex: 90,
        minWidth: 216,
        background: 'var(--chrome-2)',
        border: '1px solid var(--chrome-line)',
        borderRadius: 10,
        padding: 5,
        boxShadow: 'var(--shadow-ctx)',
        left,
        top
      }}
    >
      {items.map((it, i) => (
        <button
          key={it.key}
          onClick={it.go}
          style={
            i === items.length - 1
              ? { ...itemStyle, marginTop: 5, borderTop: '1px solid var(--chrome-line)', paddingTop: 9, borderRadius: '0 0 6px 6px' }
              : itemStyle
          }
          className={it.danger ? 'nf-ctx-danger' : 'nf-ctx-item'}
        >
          <span>{it.label}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{it.key}</span>
        </button>
      ))}
    </div>
  )
}
