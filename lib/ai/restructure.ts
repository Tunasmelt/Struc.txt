import {
  MeetingMinutesSchema,
  PROMPT_VERSION_MEETING_MINUTES,
  getMeetingMinutesPrompt,
  getRepairPrompt,
  MeetingMinutesData,
} from '../prompts/meetingMinutes'
import { generateWithGemini, generateWithGroq, LLMResult } from './providers'

export interface RestructureResult {
  body: Record<string, unknown>
  model_used: string
  prompt_version: string
}

/**
 * Executes LLM call with Gemini primary, Groq fallback, and Zod repair retry.
 */
export async function restructureNoteContent(rawText: string): Promise<RestructureResult> {
  const prompt = getMeetingMinutesPrompt(rawText)
  let llmResult: LLMResult | null = null
  let providerUsed: 'gemini' | 'groq' = 'gemini'

  // Attempt Primary: Gemini
  try {
    llmResult = await generateWithGemini(prompt)
  } catch (err: unknown) {
    console.warn('Gemini failed or rate-limited, attempting Groq fallback:', (err as Error)?.message || err)
    providerUsed = 'groq'
    try {
      llmResult = await generateWithGroq(prompt)
    } catch (groqErr: unknown) {
      console.error('Groq fallback also failed:', (groqErr as Error)?.message || groqErr)
    }
  }

  // If both providers failed or threw errors (e.g., missing keys in dev environment)
  if (!llmResult) {
    return createUnstructuredFallback(rawText, 'fallback/no-provider-response')
  }

  // First Validation Pass
  const firstParse = tryParseAndValidate(llmResult.text)
  if (firstParse.success) {
    return {
      body: firstParse.data as Record<string, unknown>,
      model_used: llmResult.model,
      prompt_version: PROMPT_VERSION_MEETING_MINUTES,
    }
  }

  // Repair Retry Pass
  console.warn('Zod validation failed on initial LLM output. Executing 1 repair retry...')
  const repairPrompt = getRepairPrompt(rawText, llmResult.text, firstParse.error)
  let repairResult: LLMResult | null = null

  try {
    if (providerUsed === 'gemini') {
      repairResult = await generateWithGemini(repairPrompt)
    } else {
      repairResult = await generateWithGroq(repairPrompt)
    }
  } catch (repairErr: unknown) {
    console.warn('Repair retry call failed:', (repairErr as Error)?.message || repairErr)
  }

  if (repairResult) {
    const secondParse = tryParseAndValidate(repairResult.text)
    if (secondParse.success) {
      return {
        body: secondParse.data as Record<string, unknown>,
        model_used: `${repairResult.model}-repaired`,
        prompt_version: PROMPT_VERSION_MEETING_MINUTES,
      }
    }
  }

  // Unstructured fallback after failed repair retry
  console.warn('Repair retry also failed validation. Storing unstructured fallback.')
  return createUnstructuredFallback(rawText, `${llmResult.model}-unstructured-fallback`)
}

function tryParseAndValidate(jsonText: string): { success: true; data: MeetingMinutesData } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(jsonText)
    const validation = MeetingMinutesSchema.safeParse(parsed)
    if (validation.success) {
      return { success: true, data: validation.data }
    } else {
      return { success: false, error: validation.error.format ? JSON.stringify(validation.error.format()) : validation.error.message }
    }
  } catch (err: unknown) {
    return { success: false, error: `Invalid JSON syntax: ${(err as Error)?.message || String(err)}` }
  }
}

function createUnstructuredFallback(rawText: string, modelLabel: string): RestructureResult {
  const summary = rawText.length > 120 ? rawText.substring(0, 120) + '...' : rawText

  const fallbackBody: Record<string, unknown> = {
    summary: summary || 'Unstructured note capture',
    attendees: [],
    key_decisions: [],
    discussion_points: [
      {
        topic: 'Raw Note Content',
        details: rawText,
      },
    ],
    action_items: [],
    fallback_unstructured: true,
  }

  return {
    body: fallbackBody,
    model_used: modelLabel,
    prompt_version: PROMPT_VERSION_MEETING_MINUTES,
  }
}
