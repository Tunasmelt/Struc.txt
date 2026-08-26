import { z } from 'zod'

export const MeetingMinutesSchema = z.object({
  summary: z.string().describe('Executive summary of the meeting'),
  attendees: z.array(z.string()).default([]).describe('List of participants/attendees mentioned'),
  key_decisions: z.array(z.string()).default([]).describe('Key decisions made during the meeting'),
  discussion_points: z.array(
    z.object({
      topic: z.string(),
      details: z.string(),
    })
  ).default([]).describe('Main topics discussed with key details'),
  action_items: z.array(
    z.object({
      item: z.string(),
      assignee: z.string().nullable().optional(),
      due_date: z.string().nullable().optional(),
    })
  ).default([]).describe('Action items or to-dos assigned'),
})

export type MeetingMinutesData = z.infer<typeof MeetingMinutesSchema>

export const PROMPT_VERSION_MEETING_MINUTES = 'v1.0-meeting-minutes'

export function getMeetingMinutesPrompt(rawText: string): string {
  return `You are an expert AI note restructurer. Parse the following raw transcript or unformatted meeting notes into structured JSON conforming EXACTLY to the Meeting Minutes schema.

SCHEMA INSTRUCTIONS:
Return a valid JSON object matching the following structure:
{
  "summary": "Brief executive summary (1-3 sentences)",
  "attendees": ["Name 1", "Name 2"],
  "key_decisions": ["Decision 1", "Decision 2"],
  "discussion_points": [
    { "topic": "Topic Name", "details": "Summary of discussion" }
  ],
  "action_items": [
    { "item": "Task description", "assignee": "Person responsible or null", "due_date": "YYYY-MM-DD or null" }
  ]
}

CRITICAL RULES:
- Output ONLY valid JSON (no markdown triple backticks, no extra text).
- Extract explicit or implicit action items, attendees, decisions, and discussion topics.
- If information for a field is missing, provide an empty array [] or null.

RAW NOTE CONTENT:
${rawText}`
}

export function getRepairPrompt(rawText: string, invalidJson: string, validationError: string): string {
  return `Your previous JSON output failed schema validation.

VALIDATION ERRORS:
${validationError}

PREVIOUS INVALID OUTPUT:
${invalidJson}

ORIGINAL RAW NOTE:
${rawText}

Please fix the errors and output ONLY valid JSON matching the schema.`
}
