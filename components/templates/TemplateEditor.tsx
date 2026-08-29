'use client'

import { useState } from 'react'
import { TemplateField } from '@/lib/prompts/dynamicTemplate'
import FieldBuilder from './FieldBuilder'

export interface TemplateDraft {
  name: string
  icon_color: string
  fields: TemplateField[]
}

interface TemplateEditorProps {
  draft: TemplateDraft
  onChange: (draft: TemplateDraft) => void
  onSave: () => void
  onCancel: () => void
  saving?: boolean
}

const DEFAULT_PIN = '#7C7468'

export default function TemplateEditor({ draft, onChange, onSave, onCancel, saving }: TemplateEditorProps) {
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    if (!draft.name.trim()) {
      setError('Give the template a name.')
      return
    }
    if (draft.fields.length === 0) {
      setError('Add at least one field.')
      return
    }
    const keys = draft.fields.map((f) => f.key)
    if (new Set(keys).size !== keys.length) {
      setError('Field keys must be unique.')
      return
    }
    setError(null)
    onSave()
  }

  return (
    <div className="rounded-xl p-4" style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome-2)' }}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="Template name"
          className="rounded-lg px-3 py-2 text-sm font-semibold"
          style={{ background: 'var(--well)', border: '1px solid var(--chrome-line)', color: 'var(--chalk)', flex: 1, minWidth: 200 }}
        />
        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          Pin color
          <input
            type="color"
            value={draft.icon_color || DEFAULT_PIN}
            onChange={(e) => onChange({ ...draft, icon_color: e.target.value })}
          />
        </label>
      </div>

      <FieldBuilder fields={draft.fields} onChange={(fields) => onChange({ ...draft, fields })} />

      {error && (
        <p className="mt-2 text-sm" style={{ color: 'var(--danger-fg)' }}>
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold"
          style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome-2)', color: 'var(--chalk)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          style={{ border: '1px solid var(--brass)', background: 'var(--brass)', color: 'var(--brass-ink)' }}
        >
          {saving ? 'Saving…' : 'Save template'}
        </button>
      </div>
    </div>
  )
}
