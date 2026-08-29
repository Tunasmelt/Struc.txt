'use client'

interface ConfirmDeleteModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDeleteModal({ open, onCancel, onConfirm }: ConfirmDeleteModalProps) {
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,7,6,.72)',
        zIndex: 96,
        display: 'grid',
        placeItems: 'center',
        padding: 24
      }}
    >
      <div style={{ width: 'min(400px,100%)', background: 'var(--chrome-2)', border: '1px solid var(--chrome-line)', borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-.02em', margin: '0 0 8px' }}>
          Delete this note?
        </h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--chalk-dim)', margin: '0 0 18px' }}>
          This also removes its action items and version history. That cascade can&apos;t be undone.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="nf-btn" style={{ border: '1px solid var(--chrome-line)', borderRadius: 8, padding: '8px 13px', fontWeight: 600, fontSize: 13, background: 'var(--chrome-2)', color: 'var(--chalk)' }}>
            Keep it
          </button>
          <button
            onClick={onConfirm}
            style={{ border: '1px solid var(--danger)', borderRadius: 8, padding: '8px 13px', fontWeight: 600, fontSize: 13, background: 'var(--danger-bg)', color: 'var(--danger-fg)' }}
          >
            Delete note
          </button>
        </div>
      </div>
    </div>
  )
}
