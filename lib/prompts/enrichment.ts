import { z } from 'zod'

/** Phase 7 — pass 2. Distinct from restructuring's per-template dynamic
 *  schema: this one is fixed, since its output shape (tags + action items)
 *  doesn't depend on which template produced the structured body it reads. */
export const EnrichmentSchema = z.object({
  tags: z.array(z.string()).max(8).default([]),
  action_items: z
    .array(
      z.object({
        text: z.string(),
        due_date: z.string().nullable().optional(),
      })
    )
    .default([]),
})

export type EnrichmentOutput = z.infer<typeof EnrichmentSchema>

export const PROMPT_VERSION_ENRICHMENT = 'v1.0-enrichment'

/** Takes the *structured* body from pass 1 — never the raw text — per the
 *  phase's explicit requirement that enrichment reads restructured content. */
export function buildEnrichmentPrompt(structuredBody: Record<string, unknown>): string {
  return `You are a tagging and action-item extraction assistant. You will be given the STRUCTURED content of an already-restructured note. Do not restructure or summarize it — only extract metadata from it.

Return JSON exactly matching this shape:
{
  "tags": ["short-keyword-1", "short-keyword-2"],
  "action_items": [{ "text": "a concrete follow-up task", "due_date": "YYYY-MM-DD or null" }]
}

Rules:
- 0 to 6 short, lowercase, one-or-two-word tags capturing topic, people, or theme. No hashtags, no punctuation.
- Only include action_items that are genuinely actionable follow-ups explicitly present in the content below — never invent ones that aren't there. An empty array is expected and fine when none exist.
- Output ONLY valid JSON, no markdown formatting, no extra commentary.

STRUCTURED NOTE CONTENT:
${JSON.stringify(structuredBody, null, 2)}`
}
