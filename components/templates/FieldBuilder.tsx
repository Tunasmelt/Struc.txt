'use client'

import { TemplateField, TemplateFieldType } from '@/lib/prompts/dynamicTemplate'

const FIELD_TYPES: TemplateFieldType[] = ['text', 'longtext', 'checklist', 'tags', 'list', 'date', 'number', 'select']

interface FieldBuilderProps {
  fields: TemplateField[]
  onChange: (fields: TemplateField[]) => void
  readOnly?: boolean
}

function slugify(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'field'
  )
}

const inputStyle = {
  background: 'var(--well)',
  border: '1px solid var(--chrome-line)',
  borderRadius: 6,
  padding: '5px 7px',
  fontSize: 12.5,
  color: 'var(--chalk)',
  fontFamily: 'var(--font-mono)'
}

export default function FieldBuilder({ fields, onChange, readOnly = false }: FieldBuilderProps) {
  const sorted = [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const commit = (next: TemplateField[]) => {
    onChange(next.map((f, i) => ({ ...f, order: i })))
  }

  const updateField = (index: number, patch: Partial<TemplateField>) => {
    const next = [...sorted]
    next[index] = { ...next[index], ...patch }
    commit(next)
  }

  const addField = () => {
    commit([
      ...sorted,
      { key: `field_${sorted.length + 1}`, label: 'New field', type: 'text', required: false, order: sorted.length }
    ])
  }

  const removeField = (index: number) => {
    const next = sorted.filter((_, i) => i !== index)
    commit(next)
  }

  const moveField = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= sorted.length) return
    const next = [...sorted]
    ;[next[index], next[target]] = [next[target], next[index]]
    commit(next)
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((field, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 rounded-lg p-2"
          style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome-2)' }}
        >
          <input
            style={{ ...inputStyle, width: 140 }}
            value={field.label}
            disabled={readOnly}
            placeholder="Label"
            onChange={(e) => updateField(i, { label: e.target.value, key: field.key || slugify(e.target.value) })}
            onBlur={(e) => {
              if (!field.key) updateField(i, { key: slugify(e.target.value) })
            }}
          />
          <input
            style={{ ...inputStyle, width: 120, opacity: 0.75 }}
            value={field.key}
            disabled={readOnly}
            placeholder="key"
            onChange={(e) => updateField(i, { key: slugify(e.target.value) })}
          />
          <select
            style={{ ...inputStyle, width: 100 }}
            value={field.type}
            disabled={readOnly}
            onChange={(e) => updateField(i, { type: e.target.value as TemplateFieldType })}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {field.type === 'select' && (
            <input
              style={{ ...inputStyle, width: 160 }}
              value={(field.options || []).join(', ')}
              disabled={readOnly}
              placeholder="option a, option b"
              onChange={(e) =>
                updateField(i, {
                  options: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                })
              }
            />
          )}
          <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
            <input
              type="checkbox"
              checked={!!field.required}
              disabled={readOnly}
              onChange={(e) => updateField(i, { required: e.target.checked })}
            />
            required
          </label>
          {!readOnly && (
            <span className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => moveField(i, -1)} title="Move up" style={{ opacity: 0.7 }}>
                ↑
              </button>
              <button type="button" onClick={() => moveField(i, 1)} title="Move down" style={{ opacity: 0.7 }}>
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeField(i)}
                title="Remove field"
                style={{ color: 'var(--danger-fg)' }}
              >
                ×
              </button>
            </span>
          )}
        </div>
      ))}
      {!readOnly && (
        <button
          type="button"
          onClick={addField}
          className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome-2)', color: 'var(--chalk)' }}
        >
          + Add field
        </button>
      )}
    </div>
  )
}
