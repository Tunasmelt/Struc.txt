'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { TemplateField } from '@/lib/prompts/dynamicTemplate'

export interface TemplateRow {
  id: string
  name: string
  icon_color: string | null
  fields: TemplateField[]
  is_preset: boolean
  user_id: string | null
  created_at: string
  updated_at: string
}

export interface TemplateInput {
  name: string
  icon_color?: string | null
  fields: TemplateField[]
}

/** Presets (is_preset = true) plus the current user's own custom templates.
 *  RLS already restricts SELECT to `is_preset = true OR user_id = auth.uid()`,
 *  so this is just an unfiltered select. */
export async function getTemplates(): Promise<TemplateRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('is_preset', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('Supabase fetch templates error:', error)
    throw new Error(`Failed to fetch templates: ${error.message}`)
  }

  return (data || []) as TemplateRow[]
}

export async function getTemplate(id: string): Promise<TemplateRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from('templates').select('*').eq('id', id).maybeSingle()

  if (error) {
    console.error('Supabase fetch template error:', error)
    throw new Error(`Failed to fetch template: ${error.message}`)
  }

  return (data as TemplateRow) || null
}

export async function createTemplate(input: TemplateInput): Promise<TemplateRow> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      name: input.name,
      icon_color: input.icon_color ?? null,
      fields: input.fields,
      is_preset: false,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase create template error:', error)
    throw new Error(`Failed to create template: ${error.message}`)
  }

  revalidatePath('/templates')
  return data as TemplateRow
}

export async function updateTemplate(id: string, input: Partial<TemplateInput>): Promise<TemplateRow> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('templates')
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.icon_color !== undefined ? { icon_color: input.icon_color } : {}),
      ...(input.fields !== undefined ? { fields: input.fields } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id) // presets have user_id NULL and can never match, enforcing "presets are read-only"
    .select()
    .single()

  if (error) {
    console.error('Supabase update template error:', error)
    throw new Error(`Failed to update template: ${error.message}`)
  }

  revalidatePath('/templates')
  return data as TemplateRow
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase.from('templates').delete().eq('id', id).eq('user_id', user.id)

  if (error) {
    console.error('Supabase delete template error:', error)
    throw new Error(`Failed to delete template: ${error.message}`)
  }

  revalidatePath('/templates')
}

/** Clones a preset (or any visible template) into a new template owned by the
 *  current user, so it can be freely edited without touching the original. */
export async function cloneTemplate(sourceId: string, overrides?: Partial<TemplateInput>): Promise<TemplateRow> {
  const source = await getTemplate(sourceId)
  if (!source) {
    throw new Error('Source template not found')
  }

  return createTemplate({
    name: overrides?.name ?? `${source.name} (copy)`,
    icon_color: overrides?.icon_color ?? source.icon_color,
    fields: overrides?.fields ?? source.fields,
  })
}
