# PHASES_AND_GATES.md — NoteFlow

This is the build order. Each phase has a **goal**, the **files/areas it's allowed to touch**, and an **exit gate** — a checklist of concrete, testable conditions that must all be true before the next phase starts.

**Why gates instead of a flat todo list:** Windsurf's slow model and Gemini both do better with a hard stop between chunks of work than with an open-ended backlog. A gate is a forced checkpoint — nothing later gets built on top of something unverified. If a gate item can't be checked off honestly, the phase isn't done, no matter how much code got written.

**Rule for every phase:** don't start it until the previous phase's exit gate is fully checked. Don't reach ahead into a later phase's files "since you're already in there." Update `HANDOFF.md` and `CHANGELOG.md` at the end of every phase, not just at the end of the project.

---

## Phase 0 — Scaffolding ✅ COMPLETED (2026-08-25)

**Goal:** A running, empty Next.js app connected to a real Supabase project, with the base schema in place and nothing else.

**Touches:** repo root, `app/`, Supabase project + database tables, `.env.local` (never committed)

**Build:**
- Next.js App Router project initialized
- Supabase project created; connection env vars set
- Base database tables: `users`, `templates`, `notes`, `note_versions`, `tags`, `note_tags`, `action_items`, `boards` per `noteflow-spec.md` §4.2
- Row-Level Security (RLS) enabled on every table, policy: user can only see their own rows
- Auth wired (Supabase Auth), one working login flow

**Exit gate:**
- [x] `npm run build` succeeds with zero errors
- [x] A logged-in user can load an empty board page with no console errors (database migration completed, auth tested)
- [ ] Attempting to query another user's row via the client returns nothing (RLS actually enforced, not just assumed) — **still genuinely open**: the 2026-09-01 live walkthrough confirmed the app works end-to-end as a single user, which is a different claim from "a second account can't see the first account's data." That needs its own deliberate two-account test (sign up as a second user, confirm their board is empty and a direct query for the first user's note id returns nothing) before this can honestly be checked off.
- [x] No API keys appear anywhere outside `.env.local`

---

## Phase 1 — Paste capture (no AI yet) ✅ user-verified 2026-08-30 (see HANDOFF session log)

**Goal:** Prove the simplest end-to-end path: paste text in, a raw note is saved, it shows up somewhere. No restructuring, no template, no board styling.

**Touches:** a minimal capture form, `notes` collection writes

**Build:**
- [x] Paste textarea → saves `raw_text` + timestamp to `notes` — `CaptureModal.tsx`'s Paste tab → `createNote`
- [x] Plain list view of saved notes (not the board yet) — **superseded**: the original plain-list UI was replaced by the real board (Phase 3) before this phase was ever closed out, so this specific build item was never literally finished as described. The underlying capture→persist→display mechanics it was meant to prove are exercised by every capture on the board today, which is what the user's manual testing through Phase 5 actually covered — noting the substitution honestly rather than silently checking off a UI that no longer exists.

**Exit gate:**
- [x] Pasting text and submitting creates a document in `notes` with the exact text preserved — user-confirmed via manual testing (2026-08-30)
- [x] Refreshing the page still shows the note (it's actually persisted, not just in React state) — user-confirmed
- [x] Works with empty template_id (nullable, per spec) — user-confirmed; `createNote`'s `templateId` param is optional and `notes.template_id` is nullable in the schema

---

## Phase 2 — Restructuring, one hardcoded template ✅ user-verified 2026-08-30 (see HANDOFF session log)

**Goal:** Prove the AI pipeline shape works before building the template system around it. Use exactly one hardcoded template (Meeting Minutes) — no template picker, no cloning, no custom fields yet.

**Touches:** `lib/prompts/`, a restructure route handler, `note_versions` collection, Zod schemas

**Build:**
- [x] Server route handler calls Gemini with the raw text + the Meeting Minutes field schema — `lib/ai/restructure.ts`, `lib/prompts/meetingMinutes.ts`
- [x] Response validated with Zod; on failure, one repair retry, then fall back to unstructured storage — `tryParseAndValidate` + repair-prompt retry in `lib/ai/restructure.ts`
- [x] On Gemini 429/5xx, fall back to Groq — `lib/ai/providers.ts`
- [x] Successful structured result written as a new document in `note_versions` — `app/actions/restructure.ts`
- [x] Restructuring runs as a background job — the raw note is visible immediately, structured version fills in when ready — `createNote`/`createAudioNote` fire restructuring fire-and-forget, never awaited before returning

**Exit gate:**
- [x] Pasting a rough meeting-notes paragraph produces a structured note matching the Meeting Minutes schema — user-confirmed via manual testing (2026-08-30)
- [x] Forcing a malformed-JSON case (mock or genuinely observed) triggers the repair retry, then the unstructured fallback — user-confirmed
- [x] Simulating a Gemini rate-limit response actually triggers the Groq fallback path — user-confirmed
- [x] The raw note remains visible on the page the whole time the restructure job is running (no blocking modal) — user-confirmed
- [x] `note_versions.model_used` and `prompt_version` are populated correctly — user-confirmed

---

## Phase 3 — Board rendering ✅ user-verified 2026-08-30 (see HANDOFF session log)

**2026-08-30 note:** the user asked for the board rebuilt to the *literal* dark-chrome prototype fidelity (not the lighter "modern flat" treatment originally shipped here), and pulled forward pin/archive/duplicate/delete/stack/auto-arrange/export/drawer/context-menu/keyboard-shortcuts — material originally scoped for Phases 8-10 below. That work landed out of order; see the "Pulled forward" note under Phases 8-10 for what's now done ahead of schedule and what's still genuinely deferred.

**Goal:** Replace the plain list with the real corkboard, matching `prototype/Struc.txt Board.dc.html` — pinned/tilted notes, drag, z-index, position persistence.

**Touches:** board page/components, `notes.position` (x, y, rotation, z_index)

**Build:**
- [x] Notes render pinned and tilted, styled per template (color/pin from the prototype's token set) — `app/board/page.tsx`, `components/board/{Board,NoteCard,Rail,Topbar,CaptureModal}.tsx`, tokens ported to `lib/tokens.ts` / `styles/tokens.css`
- [x] Drag to reposition, click/drag brings a note to front, both persisted (see below)
- [x] Basic empty state, plus template-filter rail with live counts and a cross-note open-action-items list
- [x] Notes/structured versions loaded from Supabase (`notes` + `note_versions`) via `enrichNote`, not mock data
- [x] Paste-capture entry point wired into the board (Topbar → `CaptureModal` → existing `createNote` action)
- [x] Drag position/z-index writes back to `notes.position` in Supabase via `updateNotePosition` (`app/actions/notes.ts`), called on drag-end and on bring-to-front; RLS-scoped to the owning user via the existing `notes` update policy (`002_add_user_id_and_rls.sql`), no new migration needed. `zTop` is seeded from the max `z_index` already on the board after each load, so stacking order keeps incrementing correctly across reloads instead of resetting.

**Exit gate:**
- [x] Visual side-by-side against the prototype HTML — same pin/tilt/paper feel, not a generic card grid
- [x] Dragging a note, reloading the page, shows it in the same place
- [x] Clicking a note behind another brings it to front, and that order survives a reload
- [x] No layout shift/jank on load with 10+ notes on the board — user-confirmed via manual testing (2026-08-30, see HANDOFF session log)

Note: position writes are fire-and-forget (`.catch` logs, doesn't block or roll back the UI) — acceptable for a single-user local edit, but if multi-device sync matters later, revisit for conflict handling.

---

## Phase 4 — Templates library ✅ user-verified 2026-08-30 (see HANDOFF session log)

**Note on verification:** the user reported finishing manual testing of Phases 1-5 as a whole, not a line-by-line report against each gate item below. Checkboxes are flipped on that basis — reasonable for general functionality, but if something like the deliberate-malformed-JSON repair-retry path specifically wasn't exercised, it's worth a closer look before treating this as airtight.

**Goal:** Real template system — the six presets, clone-and-customize, and fully custom templates from scratch.

**Touches:** `templates` collection, template editor UI, prompt generation (must now read the schema dynamically, not a hardcoded string)

**Build:**
- [x] Six preset templates seeded (SOAP, meeting minutes, 1:1, journal, interview, lecture) — `supabase/migrations/004_seed_preset_templates.sql`. `fieldlog` from the prototype deliberately stays a user-buildable custom template, not a 7th preset, per the spec's "six presets" language. **Requires running this migration against the real Supabase project before presets appear** — not yet applied, no DB credentials available in the dev session that built it.
- [x] Clone a preset → edit fields → save as a new template — `app/templates/page.tsx`, `components/templates/{TemplateEditor,FieldBuilder}.tsx`, `app/actions/templates.ts` (`cloneTemplate`)
- [x] Build a template from scratch: field builder supports all 7 types (text / longtext / checklist / tags / list / date / number / select), required flag, options for `select`, reorder via up/down
- [x] Restructuring prompt now generated from whichever template is active — `lib/prompts/dynamicTemplate.ts` (`buildTemplateSchema`, `buildTemplatePrompt`) maps each field type to a Zod type and a prompt instruction; `lib/ai/restructure.ts` takes an optional template and falls back to the exact original Phase 2 hardcoded Meeting Minutes path when none is given, so nothing regressed
- [x] Template can be picked before capture (`CaptureModal` picker) or applied after (`NoteCard`'s "⚙" affordance → `applyTemplateToNote`, which re-runs restructuring against the newly chosen template)

**Exit gate:**
- [x] All six presets restructure correctly, each producing output matching its own schema — user-confirmed via manual testing (2026-08-30)
- [x] A newly created custom template (not a preset) restructures correctly on the first real attempt — user-confirmed
- [x] Picking a template after capture (not before) restructures the already-saved raw text correctly — user-confirmed
- [x] Zod validation genuinely fails and recovers for at least one deliberately malformed case per field type in use — user-confirmed

**Before closing this phase:** (1) run `004_seed_preset_templates.sql` against Supabase, (2) do a real paste-capture smoke test through all six presets plus one custom template, (3) provoke at least one malformed-JSON case per field type actually in use and confirm the repair retry recovers it.

---

## Phase 5 — Search & filters ✅ user-verified 2026-08-30 (006 applied, see HANDOFF session log)

**Goal:** Structured filters plus full-text search across finished notes.

**Touches:** `notes.search` (already existed from Phase 0 but was buggy — see below), filter UI, chip bar

**Build:**
- [x] Filter by tag, date range, template — `app/board/page.tsx`'s `matches()`, wired to the rail/chip UI pulled forward during the board fidelity pass. Title isn't a separate filter chip; it's covered by full-text search below since `notes.search` includes the title.
- [x] Full-text search across the concatenated search field (title + raw_text + structured body) using real PostgreSQL full-text search — `searchNoteIds` (`app/actions/notes.ts`) uses Supabase's `.textSearch()`, which the existing `gin(to_tsvector('english', search))` index (from `001_base_schema.sql`) covers. Debounced 250ms from the board's search box.
- [x] **Bug fix, found while building this**: `update_notes_search_vector()` (the Phase 0 trigger populating `notes.search`) references `NEW.body`, a column that doesn't exist on `notes` (structured content lives in `note_versions.body`) — as currently written in `001_base_schema.sql`, this raises a Postgres error (`record "new" has no field "body"`) on every note insert/update. Whether this has actually been biting in the live project depends on whether the trigger function as currently in the repo is exactly what's deployed there (migrations are manually applied, so it's possible an earlier, different version is what's actually live) — worth checking directly. `supabase/migrations/006_fix_search_trigger_and_fts.sql` fixes it to pull the latest `note_versions` row via subquery, and adds a trigger so a note's `search` column updates when its restructuring finishes (previously nothing re-ran the notes trigger after that async step, so `search` never picked up structured content at all, bug or no bug).
- [x] Non-matching notes hide from the board rather than causing a re-layout — notes are absolutely positioned already, so filtering the rendered array doesn't reflow anything; no separate fade treatment was needed to satisfy this.

**Exit gate:**
- [x] Each filter type returns correct results against a seeded set of at least 8 varied notes — user-confirmed via manual testing (2026-08-30), after applying `006`
- [x] Full-text search finds a phrase that only appears inside a structured field value, not just in the title — user-confirmed
- [x] Combining two filters (e.g. tag + date range) narrows correctly, not just applies the last one — `matches()` ANDs every active filter together, true by construction

---

## Phase 6 — Audio capture ✅ user-verified 2026-09-01 (live walkthrough, see HANDOFF session log)

**Goal:** Recording, live transcript, and the Whisper cleanup pass.

**Touches:** MediaRecorder integration, Web Speech API integration, audio blob storage (Supabase Storage), Groq Whisper call

**Build:**
- [x] Record button → `MediaRecorder` captures audio locally — `components/board/CaptureModal.tsx`, new "Record" tab alongside the existing "Paste" tab (paste stays the default; recording requires a mic-permission prompt, so it's opt-in per capture rather than the modal's default state)
- [x] Live transcript via Web Speech API where supported — feature-detected (`window.SpeechRecognition || window.webkitSpeechRecognition`), shown live under the recording UI; a real audio-level meter (Web Audio `AnalyserNode`, not a fake animation) drives the 18-bar visualizer from the prototype
- [x] On stop, audio blob uploaded to a private storage bucket — `supabase/migrations/007_audio_storage_bucket.sql` creates a private `audio-captures` bucket with RLS policies scoping each object to `${user.id}/...` (upload happens client-side via the browser Supabase client, since only the browser has mic/MediaRecorder access)
- [x] Async Whisper cleanup pass replaces/improves the live transcript once it returns — `app/actions/audio.ts`'s `createAudioNote` inserts the note immediately (visible with the live/placeholder transcript), then `transcribeAndRestructure` runs in the background: downloads the blob server-side, calls Groq Whisper (`lib/ai/transcribe.ts`, `whisper-large-v3-turbo`), overwrites `raw_text` with the result, then triggers the existing Phase 2 restructuring pipeline against the Whisper transcript
- [x] Graceful behaviour where Web Speech isn't supported — recording and upload proceed identically either way; the only difference is whether `liveTranscript` is empty (falls back to a placeholder string) until Whisper returns. If Whisper itself fails, restructuring still runs against whatever `raw_text` exists rather than leaving the note stuck.

**Exit gate:**
- [x] Recording produces a stored audio blob accessible only via a signed URL, never a public path — user-confirmed via live walkthrough (2026-09-01)
- [x] Live transcript appears while recording in a supporting browser — user-confirmed
- [x] In a non-supporting browser (or with Web Speech disabled), recording still completes and a transcript still arrives via Whisper — user-confirmed
- [x] The restructuring pipeline from Phase 2 runs correctly on a Whisper-sourced transcript, unchanged — user-confirmed

---

## Phase 7 — Enrichment pass (tags + action items) ✅ user-verified 2026-09-01 (live walkthrough, see HANDOFF session log)

**Goal:** The second LLM call — auto-tagging and action-item extraction — running as a genuinely separate pass from restructuring.

**Touches:** enrichment route handler, `tags`/`note_tags`, `action_items`, global action-item list UI

**Note on scope:** this phase's real `action_items`/`tags` tables are a *different* concept from a template's own `checklist`/`tags`-typed structured fields (e.g. Meeting Minutes already has an `action_items` field as part of its pass-1 output). Both now coexist in the UI — the template's own field renders as regular structured content (unchanged), while this phase's enrichment output is a separate, cross-template, cross-note system. See the doc comments on `ActionItemRow`/`NoteTagRow` in `components/board/types.ts`.

**Build:**
- [x] Second call takes the *structured* body (not raw text) and returns suggested tags + extracted action items — `lib/prompts/enrichment.ts` (fixed schema, not per-template dynamic — its shape doesn't depend on which template produced the body it reads), `lib/ai/enrich.ts` (`enrichNoteContent`, Gemini-primary/Groq-fallback, reusing the same providers as pass 1 but its own prompt and its own request)
- [x] User confirms/edits suggested tags before they're saved as confirmed — `note_tags.status` starts `'suggested'` (existing Phase 0 default), `confirmTag`/`rejectTag` in `app/actions/enrich.ts` flip it to `'confirmed'` or delete the row; suggested chips render with a dashed border and inline ✓/× buttons in both `NoteCard.tsx` and `Drawer.tsx`, visually distinct from solid confirmed-tag chips
- [x] Action items appear both inline on the note (`NoteCard.tsx`'s new "Action items" block, `Drawer.tsx`'s "Extracted action items") and in a cross-note global list in the rail (`Rail.tsx`'s "Open action items" now reads real `action_items` rows instead of the old template-checklist-derived, always-unchecked list it used before this phase)
- [x] Enrichment failure does not affect the note or its restructured content — `enrichNoteAction` wraps everything (the LLM call, Zod validation, all DB writes) in one try/catch that only logs; it never writes to `notes`/`note_versions`, and is fired fire-and-forget *after* the pass-1 `note_versions` insert already succeeded (`app/actions/restructure.ts`), so a pass-2 failure structurally cannot touch pass-1's already-saved row

**Exit gate:**
- [x] Forcing pass 2 to fail (mocked error) leaves the structured note from pass 1 completely intact — user-confirmed via live walkthrough (2026-09-01)
- [x] Suggested tags are visually distinct from confirmed tags until the user acts on them — user-confirmed
- [x] Marking an action item done in the global list updates it inline on the note, and vice versa — user-confirmed
- [x] Enrichment genuinely runs as a second network call, not folded into the pass 1 prompt — user-confirmed

---

## Phase 8 — Version history ✅ user-verified 2026-09-01 (live walkthrough, see HANDOFF session log)

**Goal:** Raw ↔ structured toggle, and "re-run with a different template" as a real, non-destructive action.

**Touches:** `note_versions` read path, drawer/detail UI, re-run action

**Build:**
- [x] Detail view toggles between raw capture and current structured version — `components/board/Drawer.tsx`
- [x] "Re-run as [different template]" creates a **new** `note_versions` row — never overwrites an existing one — reuses `applyTemplateToNote`/`restructureNoteAction`, which always `INSERT`s into `note_versions`, never `UPDATE`s
- [x] Old versions remain readable / browsable in the UI — a version picker in `Drawer.tsx` lists every `note_versions` row for the note (newest first, labeled by date + the template that produced it), switching resolves that version's own body *and* its own template's fields, not just swapping the body against the current template. `getNotes()` already fetched every version (`note_versions(*)`, not filtered to latest), so no query change was needed — just using data that was already being loaded and discarded.

**Exit gate:**
- [x] Re-running a note through a second template leaves the first version's row untouched in the database — user-confirmed via live walkthrough (2026-09-01)
- [x] The raw capture is provably never modified by any restructure or re-run — user-confirmed
- [x] Switching between two prior versions in the UI shows genuinely different structured content, not the same cached response twice — user-confirmed; switching versions re-resolves both body and template together (a version re-run under a different template correctly shows that template's own fields, not the current template's fields applied to old data)

---

## Phase 9 — Board quality-of-life interactions ✅ user-verified 2026-09-01 (live walkthrough, see HANDOFF session log)

**Pulled-forward note:** the user asked for the full prototype's dark-chrome board fidelity ahead of schedule, which required building most of this phase's interaction set early. What actually landed, so this phase isn't re-built from scratch later:

- [x] Stack all / auto-arrange / one-level "Restore" undo — `app/board/page.tsx` (`toggleStack`, `autoArrange`, `restoreLayout`), client-side, skips pinned notes, snapshot-based restore, respects the active filter set (operates on `matches()`-filtered notes only)
- [x] Resize (width only, clamped) — session-local, unchanged from Phase 3
- [x] Collapse to header card — session-local, unchanged from Phase 3
- [x] Duplicate and delete with confirm — `duplicateNote`/`deleteNote` server actions (`app/actions/notes.ts`), `ConfirmDeleteModal.tsx`; delete cascades via the existing `notes` → `note_versions`/`action_items` `ON DELETE CASCADE` foreign keys from `001_base_schema.sql`
- [x] Pin/archive — `pinned`/`archived` columns via `supabase/migrations/005_add_pinned_archived_to_notes.sql` (applied), `updateNoteFlags` action, toast-with-undo on archive
- [x] Board theme switch (felt/cork/slate/chalkboard) — `lib/tokens.ts`'s `BOARD_THEMES` (ported verbatim from `prototype/tokens.js`'s `THEMES`), a selector in `Topbar.tsx`, applied by setting `--felt`/`--felt-2`/`--brass` directly on the root element (same mechanism the prototype's own `applyTheme` used, bypassing the separate light/dark mode CSS blocks so a theme choice looks the same in either appearance), persisted to `localStorage`. Template pin/stock colors are defined entirely separately in `TEMPLATES`/`icon_color` and are never touched by this.

**Exit gate (reassessed against what actually landed):**
- [x] Stacking respects the active filter set — a filtered-out note never moves (structurally true by construction — `toggleStack`/`autoArrange` only reposition `matches()`-filtered, non-pinned notes)
- [ ] Un-stacking (or dragging a note out of the stack) restores its pre-stack position exactly — **the prototype itself doesn't actually do this either**: re-reading `Board.dc.html`'s own drag handler, dragging any note while stacked just clears the `stacked` flag (`if (this.state.stacked) this.setState({ stacked: false })`) without repositioning anything — it doesn't auto-restore per-note positions on drag-out, only the explicit "Restore" button does (via the snapshot). This repo's `handlePositionChange` matches that exact behavior. Leaving unchecked since the gate's literal wording ("restores its pre-stack position exactly" via un-stacking-by-drag) isn't something the prototype itself does, so it may be worth revising the gate's wording rather than the code.
- [x] Auto-arrange's "Restore layout" genuinely reverses it, once — user-confirmed via live walkthrough (2026-09-01)
- [x] Deleting a note removes its action items and version history too — user-confirmed
- [x] Theme switch changes the board surface only — user-confirmed

---

## Phase 10 — Export ✅ user-verified 2026-09-01 (live walkthrough, see HANDOFF session log)

**Goal:** Real Markdown/plain-text/image export; PDF stubbed with an honest "coming soon."

**Touches:** export menu, client-side generation, canvas-rendering library integration

**Build:**
- [x] Markdown and plain-text export, single note and whole (filtered) board — `lib/board/exportNote.ts`, no external library
- [x] Image export via `html2canvas` (confirmed a real, current package — `1.4.1` — before installing), single note and whole board
- [x] PDF path present in the export menu but explicitly says "coming soon" — no fake success state

**Exit gate:**
- [x] Exported Markdown/text genuinely reflects the note's current structured content, including checklists and tags — user-confirmed via live walkthrough (2026-09-01)
- [x] Image export produces a real downloadable file, not a broken canvas — user-confirmed
- [x] Clicking "PDF" tells the user honestly that it isn't built yet — it does not silently fail or produce an empty file — user-confirmed

---

## Deferred (P2 — do not build without explicit go-ahead)

Real-time collaboration, multi-speaker diarization, linked notes/backlinks, bulk import from other note apps, native/PWA mobile, due-date reminders, read-only sharing links. All are in the spec as intentionally out of v1 scope. If a task ever asks for one of these, treat that as worth double-checking before starting.
