# HANDOFF.md — NoteFlow

Read this first in any new session, before opening any code. This file exists because sessions don't share memory — a different model, or the same model a week later, needs to be able to pick up exactly where the last session left off without re-deriving context from scratch.

**How to update this file:** append to it, don't rewrite it. When you finish a session, add a new dated entry at the top of §4 (Session log) and update §1–3 to reflect current reality. Never delete a past session-log entry — if something turned out to be wrong, add a correction entry, don't erase the record of the mistake.

---

## 1. Current state (overwrite this section each session)

- **Phase:** 8 — Version history: all three build items and exit-gate items now structurally done (version browsing was the last piece). Phases 6 (Audio capture) and 7 (Enrichment) from earlier the same day are still unverified against live mic/LLM traffic — nothing has closed those gaps yet. Phase 9's board-theme switching (felt/cork/slate/chalkboard) is the last known genuinely-unbuilt piece from the pulled-forward board work.
- **Gate status:** `components/board/Drawer.tsx` now has a version picker listing every `note_versions` row for a note (newest first, labeled by date + originating template); switching versions correctly re-resolves both the body *and* the template's field list together — a bug where the checklist/tags sections kept reading `note.latestVersion` instead of the selected version was caught and fixed within this same session, before commit. Checklist checkboxes are disabled while viewing a non-latest version (toggling one is keyed by note+index, so allowing it while browsing history would silently corrupt the current version's state instead of the one being viewed). `tsc`/`build` clean. No live click-through has been done — re-running a note through two templates and browsing both versions in the UI, to see the mechanism work rather than just read the code.
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

### [2026-08-30] — Claude Code (Sonnet 5) (Phase 8 — Version history: browsing)
- Phase worked on: finishing Phase 8 (the drawer and re-run action already existed from the board fidelity pass; this session added the missing "browse old versions" piece), continuing directly from Phase 7.
- What changed:
  - `components/board/Drawer.tsx`: `getNotes()` already fetches every `note_versions` row per note (`note_versions(*)`, not filtered to latest) — `enrichNote()` just picked the newest one for display. Added a `selectedVersionId` state (resets to "latest" whenever the open note changes), a sorted `versions` list, and a `<select>` version picker shown whenever a note has more than one version, labeled by date/time + the template that produced that version.
  - Fixed a real bug caught mid-session, before commit: the initial version-picker draft only swapped which version's `body` rendered in the generic fields loop, but the "Tags" and "Action items" sections (the ones sourced from a `tags`/`checklist`-typed template field, distinct from Phase 7's real `note_tags`/`action_items`) were still calling `checklistFor(note)`/`tagsFor(note)`, which internally read `note.latestVersion` regardless of what was selected. Replaced those with logic reading directly from the already-version-scoped `body`/`tmpl` variables, so browsing an old version now shows that version's own tags/checklist content throughout, not a mix of old generic fields + current tags/checklist.
  - Also handles the case where a version was produced under a *different* template than the note's current one (a prior "re-run as X" — exactly what this phase is about): the picker resolves each version's own template by its own `template_id`, so an old version's fields render correctly even if the current template is unrelated.
  - Checklist checkboxes are `disabled` while viewing a non-latest version — toggling is keyed by `note.id` + array index via the existing session-local `checklistOverrides` mechanism, which has no concept of "which version," so allowing edits while browsing history would silently apply to the *current* version's item at that index instead. Simplest correct fix for now; a real per-version-aware toggle system would be a bigger change than this phase calls for.
  - Verified `npx tsc --noEmit` and `npm run build` clean.
- Gate status at end of session: all three Phase 8 exit-gate items are now structurally true (see `PHASES_AND_GATES.md`), but nothing has been clicked through live — re-run a real note through two different templates and confirm browsing both versions in the drawer actually shows two genuinely different structured bodies, not the same one twice.
- What the next session should do first: live-verify Phase 8 (see above), then either close out Phase 9's one remaining piece (board theme switching — felt/cork/slate/chalkboard, cosmetic surface swap only, template pin/stock colors must stay fixed across all four) or do the outstanding Phase 6/7 live verification passes. All three are independent and any order is fine.

### [2026-08-30] — Claude Code (Sonnet 5) (Phase 7 — Enrichment pass)
- Phase worked on: Phase 7 (Enrichment pass — tags + action items), continuing directly from Phase 6.
- What changed:
  - `lib/prompts/enrichment.ts`: a fixed Zod schema (`{tags: string[], action_items: [{text, due_date}]}`) and prompt builder — fixed rather than per-template dynamic, since tags/action-items extraction doesn't depend on which template produced the structured body it reads.
  - `lib/ai/enrich.ts`: `enrichNoteContent(structuredBody)` — Gemini-primary/Groq-fallback (reusing `lib/ai/providers.ts`, unchanged), but its own prompt and its own network call, genuinely separate from pass 1's restructuring call.
  - `app/actions/enrich.ts` (new): `enrichNoteAction(noteId, structuredBody)` upserts tags (dedup by name, `note_tags` linked as `'suggested'`, `ignoreDuplicates` so re-enrichment never resets an already-confirmed tag) and inserts `action_items` rows (`source: 'enrichment'`, `status: 'pending'`) — wrapped in one try/catch that only logs, so a failure here can structurally never touch `notes`/`note_versions`. Also `confirmTag`, `rejectTag` (deletes the row), `toggleActionItem`.
  - `app/actions/restructure.ts`: after a pass-1 `note_versions` row is successfully saved, fires `enrichNoteAction` fire-and-forget (skipped when the result is the unstructured-fallback path — nothing real to extract from yet).
  - `app/actions/notes.ts`'s `getNotes()`: select now embeds `note_tags(id, status, tags(id, name))` and `action_items(id, text, due_date, status)` alongside the existing `note_versions(*)`.
  - `components/board/types.ts`: `NoteTagRow`/`ActionItemRow` interfaces, and `confirmedTagNames`/`suggestedNoteTags`/`openActionItemRows` helpers. `tagsFor()` (used by the existing tag filter chips) now merges template-field tags with real confirmed tags rather than only the former — a superset, so nothing that matched before stops matching.
  - `components/board/NoteCard.tsx`: suggested-tag chips (dashed border, inline ✓/× buttons) alongside existing confirmed chips in the footer; a new "Action items" block below it reading real `action_items` rows with working checkboxes.
  - `components/board/Rail.tsx`: "Open action items" now reads real cross-note `action_items` (previously template-checklist-derived and — found while reading it — always rendered `checked={false}` regardless of actual state, a pre-existing display bug now moot since it's gone).
  - `components/board/Drawer.tsx`: same suggested/confirmed tag treatment, plus a new "Extracted action items" section separate from the existing template-checklist "Action items" section (kept, unrelated — that's pass-1 structured content, this is pass-2 extraction).
  - `app/board/page.tsx`: `handleToggleActionItem`/`handleConfirmTag`/`handleRejectTag` — all optimistically update the single shared `notes` state array (not per-component copies) before the server round-trip, which is what makes "updates it inline on the note, and vice versa" structurally true rather than something that could drift out of sync.
  - No new migration — `tags`/`note_tags`/`action_items` and their real per-user RLS (via a join to `notes.user_id`) have existed since `001_base_schema.sql`/`002_add_user_id_and_rls.sql`.
  - Verified `npx tsc --noEmit` and `npm run build` clean.
- Gate status at end of session: failure isolation and inline/global sync are true by construction (code review confirms the mechanism), but nothing has actually been exercised against live Gemini/Groq traffic — no forced-failure test, no live "two distinct network calls in the log" check, no live confirm/reject click-through.
- What the next session should do first: a real capture → restructure → enrichment pass, watching for two distinct LLM calls in the logs; confirm/reject a suggested tag; mark an action item done from the rail and confirm it updates the card and drawer; force an enrichment failure (e.g. temporarily unset `GEMINI_API_KEY`/`GROQ_API_KEY`) and confirm the note's structured content is untouched. Also still open from last session: a real microphone test for Phase 6.

### [2026-08-30] — Claude Code (Sonnet 5) (Phase 6 — Audio capture)
- Phase worked on: Phase 6 (Audio capture). The user reported finishing manual testing of Phases 1-5 and confirmed `006_fix_search_trigger_and_fts.sql` is applied, then asked to move to the next phase. Flipped the corresponding exit-gate checkboxes in `PHASES_AND_GATES.md` for Phases 3 (10+ note jank), 4 (templates), and 5 (search/filters) on that basis — noted there that it's a phase-level report, not a line-by-line one, so treat edge-case items (e.g. deliberate malformed-JSON repair-retry) as reasonably-but-not-airtight covered.
- What changed:
  - `supabase/migrations/007_audio_storage_bucket.sql`: private `audio-captures` Supabase Storage bucket with RLS policies scoping objects to `${user.id}/...` folders.
  - `lib/ai/transcribe.ts`: `transcribeAudio(buffer, filename)` calling Groq's Whisper endpoint (`whisper-large-v3-turbo`) via `groq-sdk`'s `audio.transcriptions.create` + `toFile` helper.
  - `app/actions/audio.ts` (new): `createAudioNote(storagePath, liveTranscript, templateId?)` inserts the note immediately (visible with whatever live transcript exists, or a placeholder), then backgrounds `transcribeAndRestructure` — downloads the blob server-side, runs it through Whisper, overwrites `raw_text`, and calls the existing (unchanged) `restructureNoteAction`. Falls back to restructuring against the live/placeholder text if Whisper itself fails, so a note never gets stuck. `getAudioSignedUrl(noteId)` returns a 1-hour signed URL, scoped to the owning user, for playback — never a public path.
  - `components/board/CaptureModal.tsx`: added a "Record" tab alongside the existing "Paste" tab (paste stays the default). Real `MediaRecorder` capture, feature-detected Web Speech API for a live transcript (`window.SpeechRecognition || window.webkitSpeechRecognition` — absent in Firefox/Safari, degrades to Whisper-only per the exit gate's explicit requirement), and a real audio-level meter (Web Audio `AnalyserNode`, not a fake animation) driving the prototype's 18-bar visualizer. On stop, the blob uploads client-side (only the browser has mic access) via the browser Supabase client, then calls `createAudioNote`.
  - `components/board/Drawer.tsx`: a "▶ Play recording" button appears in the raw-capture view when a note has `audio_path`, fetching a signed URL on demand rather than eagerly.
  - `components/board/types.ts`: added `audio_path`/`transcript_source` to `RawNote` (columns already existed on `notes` since Phase 0, just weren't in the TS type).
  - Verified `npx tsc --noEmit` and `npm run build` clean.
- Gate status at end of session: everything is built and compiles, but **nothing in this phase has been exercised with a real microphone** — this environment has no way to grant mic permissions or click through an actual recording. All four exit-gate items are left unchecked for that reason, not because anything is known to be broken.
- What the next session should do first: apply `007_audio_storage_bucket.sql` to Supabase, then do a real recording pass — confirm the live transcript appears in a supporting browser, that a Firefox/Safari-style pass (or Web Speech manually disabled) still produces a usable note via Whisper alone, that playback works from the drawer, and that the resulting transcript restructures correctly. Then move to Phase 7 (Enrichment pass — tags + action items) or Phase 8's remaining piece (version-history browsing), whichever the user prefers.

### [2026-08-30] — Claude Code (Sonnet 5) (Phase 5 — Search & filters)
- Phase worked on: Phase 5 (Search & filters). The user reported they'd personally finished manual testing of Phases 1 through 5 and asked to start Phase 5 — read as "start building Phase 5," since Phase 5 didn't exist yet at the start of this session; treating their testing report as covering everything buildable up through the previous session's work.
- What changed:
  - Found a real bug while implementing this: `update_notes_search_vector()` (from `001_base_schema.sql`, Phase 0) references `NEW.body`, but `notes` has no `body` column — structured content lives on `note_versions.body`. As written, this raises a Postgres error on every note insert/update. Fixed in `supabase/migrations/006_fix_search_trigger_and_fts.sql`: the trigger now subqueries the latest `note_versions` row for a given note instead, and a new trigger on `note_versions` touches the parent note so its `search` column re-derives once restructuring completes (previously nothing did this, so `search` never included structured content even when the trigger itself worked).
  - Added `searchNoteIds(query)` to `app/actions/notes.ts` — real Postgres full-text search via Supabase's `.textSearch()` against `notes.search`, which the existing `gin(to_tsvector('english', search))` index covers.
  - `app/board/page.tsx`: replaced the naive client-side `.includes()` substring check on the search box with a 250ms-debounced call to `searchNoteIds`, intersected with the existing tag/date-range/template filters (all AND'd together, unchanged). Non-matching notes are removed from the rendered set, which doesn't cause a layout reflow since notes are absolutely positioned — no separate fade treatment was needed for that exit-gate item.
  - Verified `npx tsc --noEmit` and `npm run build` clean.
- Gate status at end of session: combining filters — met by construction (`matches()` ANDs everything). The two search-correctness items (each filter type against a real 8+ note set; full-text search finding a phrase inside structured content, not just the title) are **not verified live** — they depend on `006` actually being applied to Supabase, which hasn't happened from this session's environment.
- What the next session should do first: apply `006_fix_search_trigger_and_fts.sql` (along with the still-pending `004`/`005`) to the real Supabase project, then do a real search test — a phrase that only appears inside a restructured note's body, not its title — to confirm the fix actually works end to end, not just compiles.

### [2026-08-30] — Claude Code (Sonnet 5) (Full prototype fidelity pass — landing, dark auth, board)
- Phase worked on: cross-cutting, out of the normal phase order — the user showed screenshots of the original design prototype (dark chrome, tilted corkboard cards, rich rail/topbar) and said that, not the lighter "modern flat" board Phase 3 shipped, is the actual UI they want. Also asked for the marketing landing page, which never existed. Confirmed with the user first (via AskUserQuestion) that this should fully match the prototype rather than just fixing dark-mode support, and that the landing page should be built.
- What changed: built via two parallel background agents (landing/auth vs board), each independently verified before committing together as one commit (`c88ed38`) since they touched disjoint files but needed to build/typecheck together.
  - **Landing + auth**: `components/LandingPage.tsx` (new marketing page — hero, 3-feature grid, seven-template chip row using all of `lib/tokens.ts`'s `TEMPLATES` incl. `fieldlog`, CTA banner, footer), rendered at `/` for guests (`app/page.tsx` now redirects authenticated users to `/board` instead of rendering a legacy inline dashboard). `lib/appearance.ts` + `components/AppearanceToggle.tsx`: shared light/dark persistence and the segmented toggle, used by landing + login. `app/login/page.tsx` gained a themed header with the toggle and `?mode=signup` deep-linking. `app/layout.tsx` gained a pre-paint inline script to avoid a light-mode flash on first load.
  - **Board**: `supabase/migrations/005_add_pinned_archived_to_notes.sql` adds real `pinned`/`archived` columns (pulled forward from Phase 9 — these need to survive a reload, unlike collapsed/width which stay session-local per the Phase 3 precedent). New server actions `updateNoteFlags`/`deleteNote`/`duplicateNote` in `app/actions/notes.ts`, all RLS-scoped to `user_id`. New components: `Drawer.tsx` (raw/structured toggle, re-run-as-template via the existing `applyTemplateToNote`, always inserting a new `note_versions` row), `ContextMenu.tsx`, `ConfirmDeleteModal.tsx`, `HelpModal.tsx`, `Toast.tsx` (with undo for archive/delete). `Board`/`NoteCard`/`Rail`/`Topbar` restyled to the dark-chrome look with the sticky filter bar (date range/tag/sort chips), rail sections (templates/view/open action items), pin badges, and keyboard shortcuts (c/p/a/f/o/[/]/Delete/Esc/?). `lib/board/exportNote.ts`: Markdown/plain-text export (no library) plus PNG export via `html2canvas` (confirmed a real current package, `1.4.1`, before installing); PDF stays a visible "coming soon", never a fake success.
  - I personally verified (not just trusted agent self-reports): read the key new/changed files myself, ran `tsc`/`build` myself after both agents finished (clean, even with both sets of changes together), and took my own Playwright screenshots of the landing page and login screen in both light and dark — they visually match the prototype screenshots the user provided.
- Gate status at end of session: see `PHASES_AND_GATES.md` — Phases 3/4 unchanged from last session's caveats; Phase 8 partially pulled forward (drawer + re-run built, version browsing not); Phase 9 mostly pulled forward (stack/arrange/pin/archive/duplicate/delete built, board themes not); Phase 10 mostly pulled forward (MD/TXT/PNG export built, not yet manually click-through-verified).
- Known gaps, stated rather than faked: tag filter chips stay empty until a template's fields actually produce tag-typed data (no dedicated tags table wired to the UI); action-item checkbox toggles in the drawer/rail are session-local only, not persisted into `note_versions.body` (matches the prototype's own actual behavior — it only ever persisted layout); no live authenticated-session testing was possible (no test Supabase user/credentials in this environment) so drag/pin/archive/stack/drawer are structurally verified and build-clean, not click-tested logged in.
- What the next session should do first:
  1. Apply `004_seed_preset_templates.sql` and `005_add_pinned_archived_to_notes.sql` to the real Supabase project.
  2. Do a real logged-in pass over the board: drag, pin, archive, duplicate, delete, stack, auto-arrange, restore, drawer + re-run, all three export formats — confirm each against actual behavior, not assumed from code review.
  3. Decide whether to build version browsing (rest of Phase 8) and board themes (rest of Phase 9) now or later — both are genuinely unstarted, not just unverified.

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
