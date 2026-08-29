import { BoardNote, checklistFor, tagsFor } from '@/components/board/types'

function fmtDate(d: string | null) {
  if (!d) return ''
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function fieldValueLines(type: string, value: unknown): string[] {
  if (value === undefined || value === null || value === '') return []
  if (type === 'tags' || type === 'list') {
    return Array.isArray(value) ? [value.map(String).join(', ')] : [String(value)]
  }
  if (type === 'checklist') {
    const items = Array.isArray(value) ? (value as { item?: string; done?: boolean }[]) : []
    return items.map((it) => `${it.done ? '[x]' : '[ ]'} ${it.item ?? ''}`)
  }
  return [String(value)]
}

/** Plain-text rendering of one note, matching the prototype's noteToText(). */
export function noteToText(note: BoardNote): string {
  const tmplName = note.tmpl?.name ?? 'Untitled template'
  let out = `${note.title || 'Untitled capture'}\n${tmplName} · ${fmtDate(note.created_at)}\n${'-'.repeat(30)}\n`
  const body = note.latestVersion?.body || {}
  for (const field of note.tmpl?.fields ?? []) {
    const lines = fieldValueLines(field.type, body[field.key])
    if (lines.length === 0) continue
    out += `\n${field.label}:\n${lines.join('\n')}\n`
  }
  const tags = tagsFor(note)
  if (tags.length) out += `\nTags: ${tags.map((t) => `#${t}`).join(' ')}\n`
  const actions = checklistFor(note)
  if (actions.length) {
    out += `\nAction items:\n${actions.map((a) => `${a.done ? '[x]' : '[ ]'} ${a.item}${a.due ? ` (due ${a.due})` : ''}`).join('\n')}\n`
  }
  return out
}

/** Markdown rendering of one note, matching the prototype's noteToMd(). */
export function noteToMd(note: BoardNote): string {
  const tmplName = note.tmpl?.name ?? 'Untitled template'
  let out = `# ${note.title || 'Untitled capture'}\n*${tmplName} · ${fmtDate(note.created_at)}*\n\n`
  const body = note.latestVersion?.body || {}
  for (const field of note.tmpl?.fields ?? []) {
    const lines = fieldValueLines(field.type, body[field.key])
    if (lines.length === 0) continue
    out += `**${field.label}**\n\n${lines.map((l) => `- ${l}`).join('\n')}\n\n`
  }
  const tags = tagsFor(note)
  if (tags.length) out += `${tags.map((t) => `\`#${t}\``).join(' ')}\n\n`
  const actions = checklistFor(note)
  if (actions.length) {
    out += `**Action items**\n\n${actions.map((a) => `- [${a.done ? 'x' : ' '}] ${a.item}${a.due ? ` _(due ${a.due})_` : ''}`).join('\n')}\n`
  }
  return out
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportNotesAsMarkdown(notes: BoardNote[]) {
  downloadFile('noteflow-board.md', notes.map(noteToMd).join('\n---\n\n'), 'text/markdown')
}

export function exportNotesAsText(notes: BoardNote[]) {
  downloadFile('noteflow-board.txt', notes.map(noteToText).join(`\n${'='.repeat(40)}\n\n`), 'text/plain')
}

/** Renders a DOM node to a PNG via html2canvas (loaded lazily so it's never
 *  bundled into the initial board load). */
export async function exportElementAsImage(el: HTMLElement, filename: string, backgroundColor: string | null) {
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(el, { backgroundColor: backgroundColor ?? undefined, scale: filename.includes('board') ? 2 : 3 })
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = filename
  a.click()
}
