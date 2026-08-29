'use client'

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

const rows = [
  { label: 'Open the note', key: 'O / Enter' },
  { label: 'Collapse / expand', key: 'C' },
  { label: 'Pin in place', key: 'P' },
  { label: 'Bring to front', key: 'F' },
  { label: 'Archive', key: 'A' },
  { label: 'Resize narrower / wider', key: '[  ]' },
  { label: 'Delete (asks first)', key: '⌫' },
  { label: 'Close panel / menu', key: 'Esc' },
  { label: 'This list', key: '?' }
]

export default function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,7,6,.6)', zIndex: 97, display: 'grid', placeItems: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ width: 'min(460px,100%)', background: 'var(--chrome-2)', border: '1px solid var(--chrome-line)', borderRadius: 12, padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-.02em', margin: '0 0 4px' }}>
          Keyboard shortcuts
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--chalk-dim)', margin: '0 0 16px' }}>
          Acts on the card under your cursor, or the focused card.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rows.map((h) => (
            <div key={h.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--rule)', fontSize: 13.5 }}>
              <span>{h.label}</span>
              <kbd
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  background: 'var(--well)',
                  border: '1px solid var(--chrome-line)',
                  borderRadius: 5,
                  padding: '3px 8px',
                  color: 'var(--chalk-dim)'
                }}
              >
                {h.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
