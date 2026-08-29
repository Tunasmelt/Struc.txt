'use server'

import { createClient } from '@/lib/supabase/server'
import { restructureNoteContent } from '@/lib/ai/restructure'
import { getTemplate } from '@/app/actions/templates'
import { revalidatePath } from 'next/cache'

/** Fallback preset used when a note has no template chosen at all, to
 *  preserve Phase 1/2 behavior of always restructuring against Meeting
 *  Minutes. Matches the id seeded in 004_seed_preset_templates.sql. */
const DEFAULT_MEETING_TEMPLATE_ID = '00000000-0000-4000-8000-000000000001'

export async function restructureNoteAction(noteId: string, rawText: string, templateId?: string | null) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const resolvedTemplateId = templateId ?? DEFAULT_MEETING_TEMPLATE_ID
  const template = await getTemplate(resolvedTemplateId).catch(() => null)

  // Execute restructuring pipeline. If we couldn't resolve a template row
  // (e.g. the preset seed migration hasn't been run yet), fall back to the
  // original hardcoded Meeting Minutes schema so restructuring still works.
  const result = template
    ? await restructureNoteContent(rawText, { id: template.id, name: template.name, fields: template.fields })
    : await restructureNoteContent(rawText)

  // Insert into note_versions
  const { data, error } = await supabase
    .from('note_versions')
    .insert({
      note_id: noteId,
      body: result.body,
      model_used: result.model_used,
      prompt_version: result.prompt_version,
      template_id: template?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to insert note_version:', error)
    throw new Error(`Failed to save structured note version: ${error.message}`)
  }

  revalidatePath('/')
  return data
}
