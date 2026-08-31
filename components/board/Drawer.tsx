'use client'

import { useEffect, useState } from 'react'
import { BoardNote, ChecklistItem, ResolvedTemplate, confirmedTagNames, suggestedNoteTags, openActionItemRows } from './types'
import { applyTemplateToNote } from '@/app/actions/notes'
import { getAudioSignedUrl } from '@/app/actions/audio'
import { noteToText } from '@/lib/board/exportNote'
import { TemplateField } from '@/lib/prompts/dynamicTemplate'

interface DrawerProps {
  note: BoardNote | null
  open: boolean
  templates: ResolvedTemplate[]
  onClose: () => void
  onPin: () => void
  onArchive: () => void
  onDuplicate: () => void
  onExportImage: () => void
  onReran: () => void
  checklistOverrides: Record<string, boolean>
  onToggleChecklistItem: (noteId: string, index: number) => void
  onToggleActionItem: (id: string, done: boolean) => void
  onConfirmTag: (id: string) => void
  onRejectTag: (id: string) => void
  onEditTitle: (id: string, title: string) => void
  onEditRawText: (id: string, rawText: string) => void
  onSaveEditedFields: (id: string, templateId: string | null, body: Record<string, unknown>) => void
}

/** One editable input per field type — mirrors how NoteCard/Drawer already
 *  render each type read-only, just swapped for an input/textarea. */
function FieldEditor({ field, value, onChange }: { field: TemplateField; value: unknown; onChange: (v: unknown) => void }) {
  const inputStyle = {
    width: '100%',
    background: 'var(--well)',
    border: '1px solid var(--chrome-line)',
    borderRadius: 7,
    padding: '7px 9px',
    color: 'var(--chalk)',
    fontSize: 13.5
  }
  switch (field.type) {
    case 'longtext':
      return <textarea value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' as const }} />
    case 'number':
      return (
        <input
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          style={inputStyle}
        />
      )
    case 'date':
      return <input type="date" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    case 'select':
      return (
        <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          <option value="">—</option>
          {(field.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    case 'tags':
    case 'list':
      return (
        <input
          type="text"
          value={Array.isArray(value) ? value.join(', ') : ''}
          onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          placeholder="Comma-separated"
          style={inputStyle}
        />
      )
    case 'checklist': {
      const items = Array.isArray(value) ? (value as ChecklistItem[]) : []
      const text = items.map((it) => `${it.done ? '[x]' : '[ ]'} ${it.item}`).join('\n')
      return (
        <textarea
          value={text}
          onChange={(e) => {
            const parsed = e.target.value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const done = /^\[x\]/i.test(line)
                const item = line.replace(/^\[[ xX]\]\s*/, '')
                return { item, done }
              })
            onChange(parsed)
          }}
          placeholder="One per line, start with [x] if done"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'var(--font-mono)' }}
        />
      )
    }
    default:
      return <input type="text" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
  }
}

function fmtDate(d: string | null) {
  if (!d) return ''
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function segStyle(on: boolean) {
  return {
    padding: '7px 14px',
    fontSize: 12.5,
    fontWeight: on ? 600 : 400,
    color: on ? 'var(--chalk)' : 'var(--chalk-dim)',
    background: on ? 'var(--hover)' : 'transparent'
  }
}

const btnStyle = {
  border: '1px solid var(--chrome-line)',
  borderRadius: 8,
  padding: '8px 13px',
  fontWeight: 600 as const,
  fontSize: 13,
  background: 'var(--chrome-2)',
  color: 'var(--chalk)',
  transition: 'var(--t-btn)'
}

export default function Drawer({
  note,
  open,
  templates,
  onClose,
  onPin,
  onArchive,
  onDuplicate,
  onExportImage,
  onReran,
  checklistOverrides,
  onToggleChecklistItem,
  onToggleActionItem,
  onConfirmTag,
  onRejectTag,
  onEditTitle,
  onEditRawText,
  onSaveEditedFields
}: DrawerProps) {
  const [showRaw, setShowRaw] = useState(false)
  const [rerunKey, setRerunKey] = useState('')
  const [rerunBusy, setRerunBusy] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingRaw, setEditingRaw] = useState(false)
  const [rawDraft, setRawDraft] = useState('')
  const [editingFields, setEditingFields] = useState(false)
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, unknown>>({})
  const [savingFields, setSavingFields] = useState(false)

  useEffect(() => {
    setAudioUrl(null)
    setSelectedVersionId(null)
    setCopied(false)
    setEditingTitle(false)
    setEditingRaw(false)
    setEditingFields(false)
  }, [note?.id])

  const handleCopyText = async () => {
    if (!note) return
    try {
      await navigator.clipboard.writeText(noteToText(note))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy note text:', err)
    }
  }

  const startEditTitle = () => {
    if (!note) return
    setTitleDraft(note.title || '')
    setEditingTitle(true)
  }

  const commitTitle = () => {
    if (!note) return
    setEditingTitle(false)
    const next = titleDraft.trim()
    if (next && next !== (note.title || '')) onEditTitle(note.id, next)
  }

  const startEditRaw = () => {
    if (!note) return
    setRawDraft(note.raw_text)
    setEditingRaw(true)
  }

  const saveRaw = () => {
    if (!note) return
    onEditRawText(note.id, rawDraft)
    setEditingRaw(false)
  }

  // Newest first. `note.note_versions` carries every version (getNotes()
  // fetches note_versions(*), not just the latest), so this is real
  // browsable history, not a snapshot.
  const versions = [...(note?.note_versions || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const selectedVersion = selectedVersionId ? versions.find((v) => v.id === selectedVersionId) ?? null : note?.latestVersion ?? null
  const isLatestVersion = !selectedVersion || selectedVersion.id === note?.latestVersion?.id
  const templatesById = Object.fromEntries(templates.map((t) => [t.id, t]))
  const versionTmpl = selectedVersion?.template_id ? templatesById[selectedVersion.template_id] ?? null : null

  const handlePlayRecording = async () => {
    if (!note || audioLoading) return
    setAudioLoading(true)
    try {
      const url = await getAudioSignedUrl(note.id)
      setAudioUrl(url)
    } finally {
      setAudioLoading(false)
    }
  }

  // Falls back to the note's current template when browsing a version whose
  // own template row can't be resolved (shouldn't happen post-Phase-4, but
  // safer than a blank pane) — the body/fields below always come from
  // `selectedVersion`, so an older version's actual saved content is never
  // mixed with the current template's field list.
  const tmpl = versionTmpl ?? note?.tmpl
  const body = selectedVersion?.body || {}

  // Template-structural checklist/tags fields, read from *this* version's
  // body — not note.latestVersion — so browsing an older version shows that
  // version's own content throughout, not a mix of old fields + current tags.
  const checklistField = tmpl?.fields.find((f) => f.type === 'checklist')
  const actions: ChecklistItem[] = checklistField && Array.isArray(body[checklistField.key])
    ? (body[checklistField.key] as ChecklistItem[])
    : []
  const tagsField = tmpl?.fields.find((f) => f.type === 'tags')
  const fieldTags: string[] = tagsField && Array.isArray(body[tagsField.key])
    ? (body[tagsField.key] as unknown[]).map(String)
    : []
  // Confirmed real tags (Phase 7) aren't version-scoped — they describe the
  // note as a whole — so they're shown regardless of which version is open.
  const tags = Array.from(new Set([...fieldTags, ...(note ? confirmedTagNames(note) : [])]))
  const suggested = note ? suggestedNoteTags(note) : []
  const enrichedActions = note ? openActionItemRows(note) : []

  // Editing structural fields only makes sense on the latest version — see
  // the same isLatestVersion guard already used for the checklist toggles
  // above; editing history here would be just as confusing as toggling a
  // checkbox in it.
  const startEditFields = () => {
    if (!tmpl) return
    setFieldDrafts({ ...body })
    setEditingFields(true)
  }

  const saveFields = async () => {
    if (!note || !tmpl) return
    setSavingFields(true)
    try {
      await onSaveEditedFields(note.id, tmpl.id, fieldDrafts)
      setEditingFields(false)
    } finally {
      setSavingFields(false)
    }
  }

  const handleRerun = async () => {
    if (!note || rerunBusy) return
    const targetId = rerunKey || note.tmpl?.id
    if (!targetId) return
    setRerunBusy(true)
    try {
      await applyTemplateToNote(note.id, targetId)
      onReran()
    } catch (err) {
      console.error('Failed to re-run template:', err)
    } finally {
      setRerunBusy(false)
    }
  }

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(440px,100%)',
        zIndex: 60,
        background: 'var(--chrome-2)',
        borderLeft: '1px solid var(--chrome-line)',
        transform: open ? 'none' : 'translateX(101%)',
        boxShadow: open ? 'var(--shadow-drawer)' : 'none',
        transition: 'var(--t-drawer)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {note && (
        <>
          <header style={{ padding: '16px 18px', borderBottom: '1px solid var(--chrome-line)', position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: 'var(--chalk-dim)'
              }}
            >
              <span className="inline-block flex-none rounded-full" style={{ width: 9, height: 9, background: tmpl?.pin ?? 'var(--rail-dot)' }} />
              <span>{tmpl?.name ?? 'Untitled template'}</span>
              <span>· {fmtDate(note.created_at)}</span>
            </div>
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                maxLength={100}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitTitle()
                  } else if (e.key === 'Escape') {
                    setEditingTitle(false)
                  }
                }}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: '-.025em',
                  margin: '10px 0 0',
                  lineHeight: 1.15,
                  width: '100%',
                  background: 'var(--well)',
                  border: '1px solid var(--brass)',
                  borderRadius: 6,
                  padding: '2px 6px',
                  color: 'var(--chalk)'
                }}
              />
            ) : (
              <h2
                title="Click to rename"
                onClick={startEditTitle}
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-.025em', margin: '10px 0 0', lineHeight: 1.15, cursor: 'text' }}
              >
                {note.title || 'Untitled capture'}
              </h2>
            )}
            <button
              onClick={onClose}
              aria-label="Close note"
              style={{ position: 'absolute', top: 14, right: 14, fontSize: 20, lineHeight: 1, color: 'var(--chalk-dim)', padding: '4px 8px' }}
            >
              ×
            </button>
          </header>

          <div style={{ display: 'flex', gap: 8, margin: '12px 18px 0', flexWrap: 'wrap' }}>
            <button className="nf-btn" onClick={handleCopyText} title="Copy this note's text" style={btnStyle}>
              {copied ? 'Copied!' : 'Copy text'}
            </button>
            <button className="nf-btn" onClick={onExportImage} title="Export this note as an image" style={btnStyle}>
              Export image
            </button>
            <button className="nf-btn" onClick={onDuplicate} title="Duplicate this note" style={btnStyle}>
              Duplicate
            </button>
            <button className="nf-btn" onClick={onPin} style={btnStyle}>
              {note.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button className="nf-btn" onClick={onArchive} style={btnStyle}>
              {note.archived ? 'Restore' : 'Archive'}
            </button>
          </div>

          <div
            role="group"
            aria-label="Version"
            style={{ display: 'flex', margin: '14px 18px 0', border: '1px solid var(--chrome-line)', borderRadius: 8, overflow: 'hidden', width: 'max-content' }}
          >
            <button onClick={() => setShowRaw(false)} style={segStyle(!showRaw)}>
              Structured
            </button>
            <button onClick={() => setShowRaw(true)} style={segStyle(showRaw)}>
              Raw capture
            </button>
          </div>

          {!showRaw && versions.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 18px 0' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Version
              </span>
              <select
                value={selectedVersion?.id || ''}
                onChange={(e) => setSelectedVersionId(e.target.value === note.latestVersion?.id ? null : e.target.value)}
                style={{ background: 'var(--chrome)', border: '1px solid var(--chrome-line)', padding: '5px 8px', borderRadius: 7, color: 'var(--chalk)', fontSize: 12.5 }}
              >
                {versions.map((v, i) => {
                  const vTmpl = v.template_id ? templatesById[v.template_id] : null
                  const label = `${new Date(v.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — ${vTmpl?.name || 'unknown template'}`
                  return (
                    <option key={v.id} value={v.id}>
                      {label}
                      {i === 0 ? ' (current)' : ''}
                    </option>
                  )
                })}
              </select>
              {!isLatestVersion && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--brass-text)', letterSpacing: '.04em' }}>
                  viewing an earlier version — re-run below still targets the current one
                </span>
              )}
            </div>
          )}

          <div style={{ padding: '16px 18px 30px', overflowY: 'auto', flex: 1 }}>
            {showRaw ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Captured {fmtDate(note.created_at)}
                  </span>
                  {!editingRaw && (
                    <button onClick={startEditRaw} style={{ fontSize: 12, color: 'var(--brass-text)', fontWeight: 600 }}>
                      Edit
                    </button>
                  )}
                </div>
                {note.audio_path && (
                  <div style={{ marginBottom: 14 }}>
                    {audioUrl ? (
                      <audio controls src={audioUrl} style={{ width: '100%' }} />
                    ) : (
                      <button onClick={handlePlayRecording} disabled={audioLoading} style={btnStyle}>
                        {audioLoading ? 'Loading…' : '▶ Play recording'}
                      </button>
                    )}
                  </div>
                )}
                {editingRaw ? (
                  <>
                    <textarea
                      autoFocus
                      value={rawDraft}
                      onChange={(e) => setRawDraft(e.target.value)}
                      rows={10}
                      style={{
                        width: '100%',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12.5,
                        lineHeight: 1.7,
                        color: 'var(--chalk)',
                        background: 'var(--well)',
                        border: '1px solid var(--brass)',
                        padding: 14,
                        borderRadius: 8,
                        resize: 'vertical'
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button className="nf-btn" onClick={saveRaw} style={{ ...btnStyle, border: '1px solid var(--brass)', background: 'var(--brass)', color: 'var(--brass-ink)' }}>
                        Save
                      </button>
                      <button className="nf-btn" onClick={() => setEditingRaw(false)} style={btnStyle}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12.5,
                      lineHeight: 1.7,
                      color: 'var(--chalk-dim)',
                      whiteSpace: 'pre-wrap',
                      background: 'var(--well)',
                      border: '1px solid var(--chrome-line)',
                      padding: 14,
                      borderRadius: 8
                    }}
                  >
                    {note.raw_text}
                  </div>
                )}
                <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--chrome-line)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.05em' }}>
                    This is what you captured. Editing it doesn't touch any already-restructured version below — re-run if you want the structured content to reflect your edit.
                  </span>
                </div>
              </div>
            ) : (
              <div>
                {!tmpl ? (
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>Still restructuring…</p>
                ) : (
                  <>
                    {isLatestVersion && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
                        {editingFields ? (
                          <>
                            <button className="nf-btn" onClick={saveFields} disabled={savingFields} style={{ ...btnStyle, border: '1px solid var(--brass)', background: 'var(--brass)', color: 'var(--brass-ink)' }}>
                              {savingFields ? 'Saving…' : 'Save'}
                            </button>
                            <button className="nf-btn" onClick={() => setEditingFields(false)} disabled={savingFields} style={btnStyle}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button onClick={startEditFields} style={{ fontSize: 12, color: 'var(--brass-text)', fontWeight: 600 }}>
                            Edit fields
                          </button>
                        )}
                      </div>
                    )}

                    {editingFields
                      ? tmpl.fields
                          .slice()
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                          .map((field) => (
                            <div key={field.key} style={{ marginBottom: 14 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--brass-text)', display: 'block', marginBottom: 5 }}>
                                {field.label}
                              </span>
                              <FieldEditor
                                field={field}
                                value={fieldDrafts[field.key]}
                                onChange={(v) => setFieldDrafts((prev) => ({ ...prev, [field.key]: v }))}
                              />
                            </div>
                          ))
                      : tmpl.fields
                          .slice()
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                          .map((field) => {
                            const value = body[field.key]
                            if (value === undefined || value === null || value === '' || field.type === 'checklist' || field.type === 'tags') return null
                            const lines = Array.isArray(value) ? value.map(String) : [String(value)]
                            return (
                              <div key={field.key} style={{ marginBottom: 16 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--brass-text)', display: 'block', marginBottom: 5 }}>
                                  {field.label}
                                </span>
                                <div style={{ lineHeight: 1.55, color: 'var(--drawer-fg)', fontSize: 14 }}>
                                  {lines.map((l, i) => (
                                    <div key={i}>{l}</div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                  </>
                )}

                {!editingFields && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--brass-text)', display: 'block', marginBottom: 5 }}>
                      Tags
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, lineHeight: 1.55, color: 'var(--drawer-fg)', fontSize: 14 }}>
                      {tags.length === 0 && suggested.length === 0 && '—'}
                      {tags.map((t) => (
                        <span key={t}>#{t}</span>
                      ))}
                      {suggested.map((t) => (
                        <span
                          key={t.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            color: 'var(--muted)',
                            border: '1px dashed var(--chrome-line)',
                            borderRadius: 99,
                            padding: '2px 5px 2px 9px'
                          }}
                        >
                          #{t.tags!.name}
                          <button onClick={() => onConfirmTag(t.id)} aria-label={`Confirm tag ${t.tags!.name}`} style={{ color: 'var(--brass-text)' }}>
                            ✓
                          </button>
                          <button onClick={() => onRejectTag(t.id)} aria-label={`Dismiss tag ${t.tags!.name}`} style={{ color: 'var(--muted)' }}>
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!editingFields && enrichedActions.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--brass-text)', display: 'block', marginBottom: 5 }}>
                      Extracted action items
                    </span>
                    {enrichedActions.map((item) => (
                      <label key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--line-2)', fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={item.status === 'done'}
                          onChange={(e) => onToggleActionItem(item.id, e.target.checked)}
                          style={{ accentColor: 'var(--brass)', marginTop: 3 }}
                        />
                        <span>
                          {item.text}
                          {item.due_date && <span style={{ color: 'var(--muted)', fontSize: 12 }}> · due {item.due_date}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {!editingFields && actions.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--brass-text)', display: 'block', marginBottom: 5 }}>
                      Action items
                    </span>
                    {actions.map((a, i) => {
                      const key = `${note.id}:${i}`
                      const done = key in checklistOverrides ? checklistOverrides[key] : !!a.done
                      return (
                        <label key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--line-2)', fontSize: 14 }}>
                          <input
                            type="checkbox"
                            checked={done}
                            disabled={!isLatestVersion}
                            title={isLatestVersion ? undefined : 'Switch to the current version to check items off'}
                            onChange={() => onToggleChecklistItem(note.id, i)}
                            style={{ accentColor: 'var(--brass)', marginTop: 3 }}
                          />
                          <span style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.65 : 1 }}>
                            {a.item}
                            {a.due && <span style={{ color: 'var(--muted)', fontSize: 12 }}> · due {a.due}</span>}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {!editingFields && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--chrome-line)', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.05em' }}>Re-run as</span>
                  <select
                    value={rerunKey || note.tmpl?.id || ''}
                    onChange={(e) => setRerunKey(e.target.value)}
                    style={{ background: 'var(--chrome)', border: '1px solid var(--chrome-line)', padding: '7px 9px', borderRadius: 8, color: 'var(--chalk)' }}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button className="nf-btn" onClick={handleRerun} style={btnStyle} disabled={rerunBusy}>
                    {rerunBusy ? 'Working…' : 'Restructure again'}
                  </button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.05em', width: '100%' }}>
                    Keeps every earlier version. Nothing is lost by trying another shape.
                  </span>
                </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
