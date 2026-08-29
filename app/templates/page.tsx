'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  TemplateRow
} from '@/app/actions/templates'
import TemplateEditor, { TemplateDraft } from '@/components/templates/TemplateEditor'
import FieldBuilder from '@/components/templates/FieldBuilder'

const EMPTY_DRAFT: TemplateDraft = { name: '', icon_color: '#7C7468', fields: [] }

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<TemplateDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await getTemplates()
      setTemplates(rows)
    } catch (err) {
      console.error('Failed to load templates:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const presets = templates.filter((t) => t.is_preset)
  const custom = templates.filter((t) => !t.is_preset)

  const startFromScratch = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId('new')
  }

  const startEdit = (t: TemplateRow) => {
    setDraft({ name: t.name, icon_color: t.icon_color || '#7C7468', fields: t.fields })
    setEditingId(t.id)
  }

  const handleClone = async (t: TemplateRow) => {
    try {
      const cloned = await cloneTemplate(t.id, { name: `${t.name} (copy)` })
      await load()
      startEdit(cloned)
    } catch (err) {
      console.error('Failed to clone template:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? Notes already using it keep their structured data.')) return
    try {
      await deleteTemplate(id)
      await load()
    } catch (err) {
      console.error('Failed to delete template:', err)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingId === 'new') {
        await createTemplate({ name: draft.name, icon_color: draft.icon_color, fields: draft.fields })
      } else if (editingId) {
        await updateTemplate(editingId, { name: draft.name, icon_color: draft.icon_color, fields: draft.fields })
      }
      setEditingId(null)
      await load()
    } catch (err) {
      console.error('Failed to save template:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="min-h-screen w-full p-6"
      style={{ fontFamily: 'var(--font-body)', background: 'var(--chrome)', color: 'var(--chalk)' }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="m-0 text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-.02em' }}>
            Templates
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/board"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold"
              style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome-2)', color: 'var(--chalk)' }}
            >
              Back to board
            </Link>
            <button
              onClick={startFromScratch}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold"
              style={{ border: '1px solid var(--brass)', background: 'var(--brass)', color: 'var(--brass-ink)' }}
            >
              + Build from scratch
            </button>
          </div>
        </header>

        {editingId && (
          <TemplateEditor
            draft={draft}
            onChange={setDraft}
            onSave={handleSave}
            onCancel={() => setEditingId(null)}
            saving={saving}
          />
        )}

        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading templates…</p>
        ) : (
          <>
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Presets
              </h2>
              <div className="flex flex-col gap-2">
                {presets.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg p-3"
                    style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome-2)' }}
                  >
                    <span
                      className="inline-block flex-none rounded-full"
                      style={{ width: 10, height: 10, background: t.icon_color || '#7C7468' }}
                    />
                    <span className="flex-1 font-semibold">{t.name}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {t.fields.length} fields
                    </span>
                    <button
                      onClick={() => handleClone(t)}
                      className="rounded-lg px-3 py-1 text-xs font-semibold"
                      style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome)', color: 'var(--chalk)' }}
                    >
                      Clone
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                My templates
              </h2>
              {custom.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  No custom templates yet — clone a preset or build one from scratch.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {custom.map((t) => (
                    <div key={t.id} className="rounded-lg p-3" style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome-2)' }}>
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block flex-none rounded-full"
                          style={{ width: 10, height: 10, background: t.icon_color || '#7C7468' }}
                        />
                        <span className="flex-1 font-semibold">{t.name}</span>
                        <button
                          onClick={() => startEdit(t)}
                          className="rounded-lg px-3 py-1 text-xs font-semibold"
                          style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome)', color: 'var(--chalk)' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="rounded-lg px-3 py-1 text-xs font-semibold"
                          style={{ border: '1px solid var(--chrome-line)', background: 'var(--chrome)', color: 'var(--danger-fg)' }}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-2">
                        <FieldBuilder fields={t.fields} onChange={() => {}} readOnly />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
