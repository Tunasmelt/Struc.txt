import { restructureNoteContent } from '../restructure'
import { MeetingMinutesSchema } from '../../prompts/meetingMinutes'

async function runTests() {
  console.log('--- RUNNING PHASE 2 RESTRUCTURING TESTS ---')

  // Test 1: Zod Schema Validation
  console.log('\n[Test 1] Schema validation test...')
  const sampleValid = {
    summary: 'Team aligned on Q3 roadmap and launch milestones.',
    attendees: ['Alice', 'Bob'],
    key_decisions: ['Approved new pricing model'],
    discussion_points: [{ topic: 'Roadmap', details: 'Reviewed feature priorities' }],
    action_items: [{ item: 'Draft press release', assignee: 'Alice', due_date: '2026-09-01' }],
  }

  const result1 = MeetingMinutesSchema.safeParse(sampleValid)
  if (result1.success) {
    console.log('✅ Test 1 Passed: Valid Meeting Minutes parsed correctly.')
  } else {
    console.error('❌ Test 1 Failed:', result1.error)
  }

  // Test 2: Invalid Schema Handling
  console.log('\n[Test 2] Invalid schema failure test...')
  const sampleInvalid = {
    summary: 12345, // invalid type
    attendees: 'Alice and Bob', // should be array
  }
  const result2 = MeetingMinutesSchema.safeParse(sampleInvalid)
  if (!result2.success) {
    console.log('✅ Test 2 Passed: Invalid schema correctly rejected by Zod.')
  } else {
    console.error('❌ Test 2 Failed: Invalid schema unexpectedly passed.')
  }

  // Test 3: End-to-end restructuring pipeline test (with API keys or fallback)
  console.log('\n[Test 3] Restructuring pipeline execution test...')
  const rawSample = `
  Meeting Notes - Project Starlight sync (Aug 26)
  Attendees: Sarah, Marcus, Dave
  We discussed the upcoming deployment schedule. Dave mentioned the database migration scripts are ready.
  Decisions made: Proceed with migration on Friday night.
  To-do list:
  - Marcus: Notify stakeholders by Thursday
  - Sarah: Run benchmark tests before deployment
  `

  try {
    const outcome = await restructureNoteContent(rawSample)
    console.log('✅ Test 3 Passed: Restructuring pipeline produced output.')
    console.log('Model used:', outcome.model_used)
    console.log('Prompt version:', outcome.prompt_version)
    console.log('Structured output keys:', Object.keys(outcome.body))
  } catch (err) {
    console.error('❌ Test 3 Failed:', err)
  }
}

runTests().catch(console.error)
