import { generateWithGemini, generateWithGroq } from './providers'
import { EnrichmentSchema, buildEnrichmentPrompt, PROMPT_VERSION_ENRICHMENT } from '../prompts/enrichment'

export interface EnrichmentResult {
  tags: string[]
  action_items: { text: string; due_date: string | null }[]
  model_used: string
  prompt_version: string
}

/** Pass 2 — a genuinely separate network call from restructuring (pass 1),
 *  reusing the same Gemini-primary/Groq-fallback providers but with its own
 *  prompt and its own request. No repair-retry here (unlike pass 1): a
 *  malformed or empty enrichment result is treated as "nothing to add" by
 *  the caller, not worth a second round-trip for tags/action-items. */
export async function enrichNoteContent(structuredBody: Record<string, unknown>): Promise<EnrichmentResult> {
  const prompt = buildEnrichmentPrompt(structuredBody)

  let llmResult
  try {
    llmResult = await generateWithGemini(prompt)
  } catch (err) {
    console.warn('Enrichment: Gemini failed, falling back to Groq:', err instanceof Error ? err.message : err)
    llmResult = await generateWithGroq(prompt)
  }

  const parsed = JSON.parse(llmResult.text)
  const validated = EnrichmentSchema.parse(parsed)

  return {
    tags: validated.tags,
    action_items: validated.action_items.map((a) => ({ text: a.text, due_date: a.due_date ?? null })),
    model_used: llmResult.model,
    prompt_version: PROMPT_VERSION_ENRICHMENT,
  }
}
