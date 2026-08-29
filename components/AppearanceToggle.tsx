'use client'

import { Appearance } from '@/lib/appearance'

function seg(on: boolean): React.CSSProperties {
  return {
    padding: '7px 13px',
    fontSize: 12.5,
    fontWeight: on ? 600 : 400,
    color: on ? 'var(--chalk)' : 'var(--chalk-dim)',
    background: on ? 'var(--hover)' : 'transparent',
  }
}

export default function AppearanceToggle({
  value,
  onChange,
}: {
  value: Appearance
  onChange: (mode: Appearance) => void
}) {
  return (
    <div
      role="group"
      aria-label="Appearance"
      style={{
        display: 'flex',
        border: '1px solid var(--chrome-line)',
        borderRadius: 8,
        overflow: 'hidden',
        flex: 'none',
      }}
    >
      <button onClick={() => onChange('light')} style={seg(value === 'light')}>
        Light
      </button>
      <button onClick={() => onChange('dark')} style={seg(value === 'dark')}>
        Dark
      </button>
    </div>
  )
}
