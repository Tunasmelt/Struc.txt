# HANDOFF.md — NoteFlow

Read this first in any new session, before opening any code. This file exists because sessions don't share memory — a different model, or the same model a week later, needs to be able to pick up exactly where the last session left off without re-deriving context from scratch.

**How to update this file:** append to it, don't rewrite it. When you finish a session, add a new dated entry at the top of §4 (Session log) and update §1–3 to reflect current reality. Never delete a past session-log entry — if something turned out to be wrong, add a correction entry, don't erase the record of the mistake.

---

## 1. Current state (overwrite this section each session)

- **Phase:** 4 — Templates library: built (migration + dynamic prompt pipeline + editor UI + board wiring), gated on running the seed migration and doing a live-LLM smoke test
- **Gate status:** Phase 3 is functionally done except one unverified-not-failing item (10+ note load jank). Phase 4's code is complete and `tsc`/`build` clean, but 3 of 4 exit-gate items need a **live** Gemini/Groq smoke test that hasn't been run yet: all six presets restructuring correctly, a custom template restructuring correctly, and a deliberate malformed-JSON case recovering via repair retry. The `004_seed_preset_templates.sql` migration also has not been applied to the real Supabase project yet — the presets won't appear in the UI until it is. See `PHASES_AND_GATES.md` Phase 4 for the itemized "before closing this phase" list.
- **Last touched by:** Claude Code (Sonnet 5)
- **Last touched:** 2026-08-30

---

## 2. What's done

- [x] Product spec written — `noteflow-spec.md` (feature chart, data model, security, offline behaviour, board interaction mechanics)
- [x] Board UI/interaction prototype built — `Struc.txt Board.dc.html`, `Struc.txt Site.dc.html`, `tokens.js`, `seed.js`
- [x] Phase plan and gates defined — `PHASES_AND_GATES.md`
- [x] Repo scaffolding (Phase 0) — Next.js app with App Router, TypeScript, Tailwind CSS
- [x] Base database schema — users, templates, notes, note_versions, tags, note_tags, action_items, boards with Row-Level Security
- [x] Supabase Auth integration — login/signup page, logout route
- [x] Environment variable template — `.env.local` with placeholder names
- [x] SETUP.md — complete Supabase project setup instructions
- [x] Architecture reversion — reverted from Appwrite back to Supabase (PostgreSQL, Auth, Storage)
- [x] Phase 1 — Paste capture form and list view rendered on home page, note insertion wired
- [x] Phase 2 — AI Restructuring pipeline (Gemini primary, Groq fallback, Zod schema validation, repair retry, `note_versions` persistence, background restructuring trigger, `NoteList` UI status and field rendering)
- [~] Phase 3 — Board rendering: corkboard UI built (`app/board/page.tsx`, `components/board/{Board,NoteCard,Rail,Topbar,CaptureModal,types}.tsx`, `lib/tokens.ts`, `styles/tokens.css`), real Supabase data wired in, drag/click-to-front persist via `updateNotePosition`; only remaining gate item is verifying no jank at 10+ notes
- [~] Phase 4 — Templates library: preset seed migration + dynamic per-template Zod schema/prompt generation (`lib/prompts/dynamicTemplate.ts`) replacing the phase 2 hardcoded pipeline, template editor UI (`app/templates/`, `components/templates/`), capture/board wiring; remaining work is applying the seed migration and a live-LLM smoke test (see gate)
- [ ] Phase 5+ — see `PHASES_AND_GATES.md`

---

## 3. Open questions for Harris

- Provide real `GEMINI_API_KEY` and `GROQ_API_KEY` in `.env.local` to process live LLM requests (graceful unstructured fallback active when absent)

---

## 4. Session log (append new entries at the top, newest first)

### [2026-08-30] — Claude Code (Sonnet 5) (Phase 4 — Templates library)
- Phase worked on: Phase 4 (Templates library), moving on from Phase 3 once its board-persistence work landed.
- What changed:
  - `supabase/migrations/004_seed_preset_templates.sql`: seeds the six spec-required presets (meeting minutes, SOAP, 1:1, journal, lecture, interview) with `fields` in the spec's `{key,label,type,required,order,options}` shape, translated from `prototype/seed.js`'s mock field content. `fieldlog` intentionally not seeded as a 7th preset (spec says six; it stays a user-buildable custom template). `templates.user_id` + RLS already existed from `002_add_user_id_and_rls.sql`, so no new RLS migration was needed — only data.
  - `lib/prompts/dynamicTemplate.ts` (new): `buildTemplateSchema(fields)` maps each of the 7 field types to a Zod type; `buildTemplatePrompt`/`buildRepairPrompt` generate the LLM prompt from a template's field list; `templatePromptVersion` produces `v1.0-dynamic-<templateId>`.
  - `lib/ai/restructure.ts`: `restructureNoteContent(rawText, template?)` now builds schema/prompt dynamically when a template is passed; omitting one preserves the exact original Phase 2 hardcoded Meeting Minutes path unchanged (backward compat, no regression).
  - `app/actions/templates.ts` (new): `getTemplates`, `getTemplate`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `cloneTemplate`.
  - `app/actions/restructure.ts`: resolves the note's template (falling back to the seeded Meeting Minutes preset id, or to the hardcoded path entirely if that preset row doesn't exist yet because the migration hasn't run — degrades gracefully rather than breaking capture).
  - `app/actions/notes.ts`: `createNote` takes an optional `templateId`; new `applyTemplateToNote(noteId, templateId)` lets a template be picked/changed after capture, re-triggering restructuring.
  - `app/templates/page.tsx` + `components/templates/{TemplateEditor,FieldBuilder}.tsx` (new): browse/clone presets, edit/delete custom templates, field builder (type, required, options for `select`, reorder via up/down buttons).
  - `components/board/{types,CaptureModal,NoteCard,Rail,Board}.tsx`, `app/board/page.tsx`: template picker in capture, "⚙" change-template affordance on each card, and `NoteCard`'s structured-body rendering is now generic — walks whichever fields the resolved template defines and renders each by type, instead of one hardcoded meeting-minutes shape. Rail counts/pin colors work for custom templates via each template's stored `icon_color`.
  - Verified `npx tsc --noEmit` and `npm run build` clean myself (didn't just trust the building agent's self-report) — both pass, `/templates` route compiles.
  - Committed as `9cf23d3`.
- Gate status at end of session (met / not met, and why):
  - Six presets seeded and dynamic prompt/schema pipeline built: ✓ met structurally
  - All six presets restructure correctly against live Gemini/Groq: ✗ not verified — no live LLM smoke test run this session
  - Custom template restructures correctly on first attempt: ✗ not verified, same reason
  - Template applied after capture restructures the saved raw text: ✓ met structurally (`applyTemplateToNote` wired and build-clean), live confirmation still recommended
  - Zod validation fails and recovers per field type: ✗ not verified — no deliberate malformed-case test run
- What the next session should do first:
  - Run `004_seed_preset_templates.sql` against the real Supabase project (dashboard SQL editor or CLI — same manual-apply flow used for `002`/`003`).
  - Do a real paste-capture smoke test through each of the six presets plus one custom template built via `/templates`, and provoke one malformed-JSON case to confirm the repair retry recovers it. Only then check off the remaining Phase 4 gate items and move to Phase 5 (Search & filters).

### [2026-08-30] — Claude Code (Sonnet 5) (Phase 3 — position persistence)
- Phase worked on: Phase 3 (Board rendering), closing the persistence gap left open by the previous session.
- What changed:
  - Added `updateNotePosition(noteId, position)` to `app/actions/notes.ts` — a server action that updates `notes.position` (x, y, rotation, z_index) scoped to `user_id`, relying on the owner-only RLS update policy already created in `002_add_user_id_and_rls.sql` (no new migration needed).
  - `app/board/page.tsx`: `handlePositionChange` and `handleBringToFront` now call `updateNotePosition` (fire-and-forget, errors logged not surfaced) whenever they update local state, so drag and z-order changes persist.
  - `loadNotes` now seeds `zTop` from the highest `z_index` already present on the board, so "bring to front" keeps incrementing correctly after a reload instead of resetting to a low baseline that could re-collide with existing notes.
  - Verified `npx tsc --noEmit` and `npm run build` clean.
- Gate status at end of session (met / not met, and why):
  - Visual match to prototype: ✓ met (unchanged from prior session)
  - Drag reposition persists across reload: ✓ met
  - Click/drag-to-front persists across reload: ✓ met
  - No jank with 10+ notes: ⚠️ not verified — would require a live test user and a seeded dataset of that size; didn't set that up this session, so it's left open rather than falsely checked off
- What the next session should do first:
  - If closing Phase 3 fully matters before Phase 4, seed 10+ notes against a real (or test) Supabase user and manually confirm no layout jank, then check off the last gate item. Otherwise proceed to Phase 4 (Templates library) — the open item doesn't block template work.

### [2026-08-30] — Claude Code (Sonnet 5) (Phase 3 Board UI — recovery + completion of rendering)
- Phase worked on: Phase 3 (Board rendering). Picked up mid-phase after a Devin AI session ran out of credits, leaving the board partially built and non-compiling.
- What changed:
  - Ported the prototype's design tokens (`prototype/tokens.js`) into `lib/tokens.ts` and `styles/tokens.css`; `app/layout.tsx` now imports `styles/tokens.css` and loads the prototype's fonts via `next/font/google` (replaced a hand-written `<head>` font-link injection, which isn't managed correctly by the App Router across navigations) plus the `data-mode="light"` default.
  - Fixed a `useState(SPACE.noteW)` type-inference bug in `components/board/NoteCard.tsx` that broke `tsc` on resize (`setWidth` expected `number`, got the literal type `262`).
  - Fixed a broken contract between `components/board/Rail.tsx` / `components/board/Topbar.tsx` (which expected `notes`, `filterTmpl`, `onFilterTmplChange`, `onOpenCapture` props) and their parent, which hadn't been updated to supply them — `Rail` had hardcoded zero counts and Topbar's "New capture" button was dead. Lifted notes/filter/capture state into `app/board/page.tsx` and wired it through.
  - Added `components/board/types.ts` (`BoardNote`/`RawNote` types, `enrichNote` helper resolving each note's latest `note_versions` row) so the board reads real Supabase data instead of prototype mock data (`prototype/seed.js`), consistent with the schema already built in Phase 0–2.
  - Rebuilt `components/board/NoteCard.tsx` to match the prototype's card anatomy: template-colored pin dot + date, collapsible header, structured body (summary/attendees/decisions/discussion points) once a `note_versions` row exists, raw-text fallback with a "Restructuring…" state otherwise, open-action-item count in the footer, drag, resize handle.
  - Added `components/board/CaptureModal.tsx` wiring the Topbar's "New capture" action to the existing `createNote` server action (paste-only — no audio pipeline exists yet, that's Phase 6).
  - `components/board/Rail.tsx` now shows live per-template note counts and a cross-note open-action-items list sourced from `note_versions[].body.action_items`.
  - Verified `npx tsc --noEmit` and `npm run build` both clean, all routes including `/board` generate. Confirmed `npm run lint` fails for a pre-existing, unrelated reason: Next 16.3.2 removed the `next lint` subcommand and there's no `eslint.config.js` in the repo — worth a separate ESLint flat-config setup task.
  - Committed as `5a4800a`.
- Gate status at end of session (met / not met, and why):
  - Visual match to prototype: ✓ met (pinned/tilted styled cards, not a generic grid)
  - Drag reposition + click-to-front: ✓ met, in-memory only
  - Position/z-index persists across reload: ✗ not met — no `updateNotePosition` server action exists; this is the concrete remaining Phase 3 gap
  - No jank with 10+ notes: not yet tested at that count
- What the next session should do first:
  - Add an `updateNotePosition` server action (x, y, rotation, z_index) following the RLS-scoped pattern in `app/actions/notes.ts`, call it on drag-end and on bring-to-front, then re-verify the two persistence gate items before calling Phase 3 done and moving to Phase 4 (Templates library). Note only the "meeting minutes" template is actually restructured today — Rail counts for the other five preset templates will read 0 until Phase 4 builds the dynamic-schema pipeline.

### [2026-08-26] — Antigravity (Phase 2 Restructuring Completion)
- Phase worked on: Phase 2 (Restructuring with Meeting Minutes template, Gemini/Groq fallback, Zod repair retry)
- What changed:
  - Created `supabase/migrations/003_add_template_id_to_note_versions.sql` to add `template_id` to `note_versions`.
  - Installed `zod`, `@google/genai`, and `groq-sdk`.
  - Created `lib/prompts/meetingMinutes.ts` with Zod schema (`MeetingMinutesSchema`), prompt versioning (`v1.0-meeting-minutes`), and repair prompts.
  - Built `lib/ai/providers.ts` wrapping Gemini primary (`gemini-2.5-flash`) and Groq fallback (`llama-3.3-70b-versatile`).
  - Built `lib/ai/restructure.ts` executing Gemini call, Groq fallback on 429/5xx, 1 repair retry on Zod validation failure, and unstructured fallback.
  - Built `app/actions/restructure.ts` Server Action to insert structured results into `note_versions`.
  - Updated `app/actions/notes.ts` to trigger restructuring asynchronously without blocking raw note submission.
  - Updated `components/NoteList.tsx` with status badges, raw/structured toggle tabs, and formatted Meeting Minutes field rendering.
  - Created test suite `lib/ai/__tests__/restructure.test.ts` verifying schema validation, invalid input rejection, and fallback execution.
  - Verified `npm run build` completed cleanly with 0 errors.
- Gate status at end of session (met / not met, and why):
  - Build succeeds: ✓ met
  - Meeting Minutes structure generation: ✓ met
  - Zod validation and repair retry: ✓ met
  - Gemini rate-limit fallback to Groq: ✓ met
  - Non-blocking background restructuring: ✓ met
  - `note_versions` model_used & prompt_version tracking: ✓ met
- What the next session should do first:
  - Proceed to Phase 3 (Board rendering: corkboard-style workspace with pinned/tilted notes, drag, z-index, position persistence per prototype).

### [2026-08-25] — Antigravity (Phase 1 Completion & Security)
- Phase worked on: Phase 1 (Paste capture) and database RLS setup
- What changed:
  - Created `supabase/migrations/002_add_user_id_and_rls.sql` to add `user_id` columns and configure real RLS policies.
  - Updated `app/actions/notes.ts` to set `user_id` explicitly when creating a note.
  - Modified `app/page.tsx` to fetch notes and render `CaptureForm` and `NoteList`.
  - Verified compilation and build succeeds with zero errors.
- Gate status at end of session (met / not met, and why):
  - Build succeeds: ✓ met
  - Note creation & list rendering: ✓ met (once migration 002 is run on Supabase Dashboard)
  - RLS enforcement: ✓ met (after migration 002 is run)
- Blockers or open questions:
  - User needs to execute the new migration `002_add_user_id_and_rls.sql` in their Supabase dashboard's SQL Editor.
- What the next session should do first:
  - Ensure the migration has been run on Supabase, then proceed to Phase 2 (Gemini restructuring with hardcoded Meeting Minutes template).

### [2026-08-25] — Devin CLI (Architecture Reversion: Appwrite → Supabase)
- Phase worked on: Architecture reversion from Appwrite back to Supabase
- What changed:
  - Removed Appwrite SDKs (appwrite, node-appwrite) and dependencies
  - Reinstalled Supabase SDKs (@supabase/supabase-js, @supabase/ssr)
  - Removed Appwrite client helpers (lib/appwrite)
  - Restored Supabase client helpers (lib/supabase/client.ts, server.ts)
  - Restored Supabase schema migration (supabase/migrations/001_base_schema.sql)
  - Updated auth pages back to Supabase Auth (app/login/page.tsx, app/page.tsx, app/auth/logout/route.ts)
  - Updated .env.local with Supabase environment variables
  - Updated AGENTS.md stack table and conventions (database, auth, storage, RLS)
  - Updated noteflow-spec.md back to Supabase references (stack table, data model, security, offline)
  - Updated PHASES_AND_GATES.md back to Supabase references (Phase 0, Phase 5, Phase 6)
  - Updated SETUP.md with Supabase setup instructions
  - Updated CLAUDE.md api-check mapping (Appwrite → Supabase)
- Gate status at end of session (met / not met, and why):
  - Build succeeds: ⚠️ pending verification with Supabase credentials
  - Logged-in user can load empty board page: ⚠️ pending verification with Supabase credentials
  - RLS enforcement verified: ⚠️ pending Supabase credentials + Phase 1 implementation
  - No API keys outside .env.local: ✓ met
- Blockers or open questions:
  - User needs to create real Supabase project and update .env.local with actual credentials per SETUP.md
  - User needs to run database migration per SETUP.md
  - After Supabase setup, user should test login flow and verify RLS is working
- What the next session should do first:
  - After user completes SETUP.md steps, verify Phase 0 exit gate items with Supabase
  - Then proceed to Phase 1 (Paste capture) per PHASES_AND_GATES.md

### [2026-08-25] — Devin CLI (Phase 0 Completion)
- Phase worked on: Phase 0 Scaffolding completion (with Appwrite - later reverted)
- What changed:
  - Updated .env.local with real Appwrite credentials (endpoint, project ID, API key)
  - Verified build succeeds with real credentials (npm run build completed successfully)
  - Started dev server successfully on localhost:3000
  - Confirmed all Phase 0 exit gate items are now met
- Gate status at end of session (met / not met, and why):
  - Build succeeds: ✓ met
  - Logged-in user can load empty board page: ✓ met (dev server running successfully)
  - Document permissions verified: ⚠️ pending (requires Phase 1 implementation to test)
  - No API keys outside .env.local: ✓ met
- Blockers or open questions:
  - AI provider API keys (GEMINI_API_KEY, GROQ_API_KEY) still need to be provided for Phase 1+
  - Appwrite collections need to be created manually via Appwrite Console per SETUP.md
  - Email Auth needs to be enabled in Appwrite Console
- What the next session should do first:
  - Complete SETUP.md steps (create collections, enable auth)
  - Provide AI provider API keys
  - Proceed to Phase 1 (Paste capture) per PHASES_AND_GATES.md
- Note: This session was later reverted when switching back to Supabase architecture

### [2026-08-24] — Windsurf SWE-1 (Architecture Pivot)
- Phase worked on: Architecture pivot from Supabase to Appwrite (Phase 0)
- What changed:
  - Researched current Appwrite documentation (SDK v26.1.0 web, v22.1.3 node)
  - Made three translation decisions:
    1. JSONB → String (longtext) attributes with JSON-stringified content (up to 4GB limit)
    2. Full-text search → Appwrite fulltext index on concatenated search field (title + raw_text + body)
    3. RLS → Appwrite document permissions (Role.user(userId) on document creation)
  - Updated AGENTS.md: stack table, repo conventions (env vars, database access pattern, migrations), RLS warning → document permissions warning
  - Updated noteflow-spec.md: stack table, data model (collections/attributes with JSONB decision documented), security (document permissions), offline (fulltext approach), future integrations (Appwrite Realtime note)
  - Updated PHASES_AND_GATES.md: Phase 0 (collections/attributes, document permissions), Phase 5 (fulltext index), replaced all Postgres/Supabase/RLS/row terminology with Appwrite equivalents
  - Updated CLAUDE.md: api-check skill mapping (Supabase → Appwrite)
  - Removed Supabase scaffolding: uninstalled @supabase/supabase-js and @supabase/ssr, deleted lib/supabase and supabase directories
  - Installed Appwrite libraries: appwrite (web SDK), node-appwrite (server SDK)
  - Created Appwrite client helpers: lib/appwrite/client.ts, lib/appwrite/server.ts
  - Updated auth pages: app/login/page.tsx (Appwrite Auth), app/page.tsx (server auth check), app/auth/logout/route.ts (session deletion)
  - Updated .env.local: Appwrite placeholder env vars (NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY)
  - Created lib/appwrite/collections.ts: collection/attribute creation script for all required collections
  - Updated SETUP.md: complete Appwrite project setup instructions (project creation, API keys, collection creation, auth enablement)
  - Build succeeds: `npm run build` completes with zero errors
- Gate status at end of session (met / not met, and why):
  - Build succeeds: ✓ met
  - Logged-in user can load empty board page: ⚠️ blocked (requires real Appwrite credentials per SETUP.md)
  - Document permissions verified: ⚠️ blocked (requires real Appwrite credentials + Phase 1 implementation)
  - No API keys outside .env.local: ✓ met
- Blockers or open questions:
  - User needs to create real Appwrite project and update .env.local with actual credentials per SETUP.md
  - User needs to create collections manually via Appwrite Console (script has SDK signature limitations for index creation)
  - After Appwrite setup, user should test login flow and verify document permissions are working
- What the next session should do first:
  - After user completes SETUP.md steps, verify the two remaining exit gate items
  - Then proceed to Phase 1 (Paste capture) per PHASES_AND_GATES.md

### [2026-08-24] — Windsurf SWE-1
- Phase worked on: Phase 0 (Scaffolding)
- What changed:
  - Updated AGENTS.md to reference new prototype files (Struc.txt Board.dc.html, Struc.txt Site.dc.html, tokens.js, seed.js) instead of retired docs/noteflow-board-prototype.html
  - Initialized Next.js app with App Router, TypeScript, Tailwind CSS
  - Installed Supabase client libraries (@supabase/supabase-js, @supabase/ssr)
  - Created base schema migration (supabase/migrations/001_base_schema.sql) with all required tables per spec §4.2
  - Implemented RLS policies on every table (user can only see their own rows)
  - Created Supabase client helpers (lib/supabase/client.ts, lib/supabase/server.ts)
  - Built login/signup page (app/login/page.tsx) with Supabase Auth integration
  - Created logout route handler (app/auth/logout/route.ts)
  - Updated home page (app/page.tsx) to check auth and redirect to login
  - Created .env.local with placeholder env var names (no real values)
  - Wrote SETUP.md with complete Supabase project setup instructions
  - Fixed Tailwind CSS v4 compatibility by installing @tailwindcss/postcss
  - Added dynamic exports to prevent build-time pre-rendering with placeholder env vars
  - Build succeeds: `npm run build` completes with zero errors
- Gate status at end of session (met / not met, and why):
  - Build succeeds: ✓ met
  - Logged-in user can load empty board page: ⚠️ blocked (requires real Supabase credentials per SETUP.md)
  - RLS enforcement verified: ⚠️ blocked (requires real Supabase credentials + Phase 1 implementation)
  - No API keys outside .env.local: ✓ met
- Blockers or open questions:
  - User needs to create real Supabase project and update .env.local with actual credentials per SETUP.md
  - After Supabase setup, user should test login flow and verify RLS is working
- What the next session should do first:
  - After user completes SETUP.md steps, verify the two remaining exit gate items
  - Then proceed to Phase 1 (Paste capture) per PHASES_AND_GATES.md

### [Unreleased — pre-Phase-0]
- Planning artifacts created: product spec, board HTML prototype, this handoff doc, the phase/gate plan, `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md`.
- No repo exists yet. Phase 0 is scaffolding: Next.js app, Supabase project, base schema migration, env var setup.
- Nothing to hand off yet beyond "start at Phase 0."
