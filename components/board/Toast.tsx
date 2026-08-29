'use client'

interface ToastProps {
  message: string
  onUndo?: (() => void) | null
}

export default function Toast({ message, onUndo }: ToastProps) {
  const visible = !!message
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 22,
        left: '50%',
        zIndex: 95,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'var(--chrome-2)',
        border: '1px solid var(--chrome-line)',
        borderRadius: 10,
        padding: '11px 18px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12.5,
        letterSpacing: '.03em',
        boxShadow: 'var(--shadow-toast)',
        color: 'var(--chalk)',
        transition: 'var(--t-toast)',
        transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(160%)',
        pointerEvents: visible ? 'auto' : 'none'
      }}
    >
      <span>{message}</span>
      {onUndo && (
        <button
          onClick={onUndo}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'var(--brass-text)',
            fontWeight: 600
          }}
        >
          Undo
        </button>
      )}
    </div>
  )
}
