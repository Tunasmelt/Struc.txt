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
- [ ] Attempting to query another user's row via the client returns nothing (RLS actually enforced, not just assumed) (requires Phase 1 implementation to test)
- [x] No API keys appear anywhere outside `.env.local`

---

## Phase 1 — Paste capture (no AI yet) 🚧 IN PROGRESS

**Goal:** Prove the simplest end-to-end path: paste text in, a raw note is saved, it shows up somewhere. No restructuring, no template, no board styling.

**Touches:** a minimal capture form, `notes` collection writes

**Build:**
- Paste textarea → saves `raw_text` + timestamp to `notes`
- Plain list view of saved notes (not the board yet)

**Exit gate:**
- [ ] Pasting text and submitting creates a document in `notes` with the exact text preserved
- [ ] Refreshing the page still shows the note (it's actually persisted, not just in React state)
- [ ] Works with empty template_id (nullable, per spec)

---

## Phase 2 — Restructuring, one hardcoded template

**Goal:** Prove the AI pipeline shape works before building the template system around it. Use exactly one hardcoded template (Meeting Minutes) — no template picker, no cloning, no custom fields yet.

**Touches:** `lib/prompts/`, a restructure route handler, `note_versions` collection, Zod schemas

**Build:**
- Server route handler calls Gemini with the raw text + the Meeting Minutes field schema
- Response validated with Zod; on failure, one repair retry, then fall back to unstructured storage
- On Gemini 429/5xx, fall back to Groq
- Successful structured result written as a new document in `note_versions`
- Restructuring runs as a background job — the raw note is visible immediately, structured version fills in when ready (per spec §4.4)

**Exit gate:**
- [ ] Pasting a rough meeting-notes paragraph produces a structured note matching the Meeting Minutes schema
- [ ] Forcing a malformed-JSON case (mock or genuinely observed) triggers the repair retry, then the unstructured fallback — verified, not assumed
- [ ] Simulating a Gemini rate-limit response actually triggers the Groq fallback path
- [ ] The raw note remains visible on the page the whole time the restructure job is running (no blocking modal)
- [ ] `note_versions.model_used` and `prompt_version` are populated correctly

---

## Phase 3 — Board rendering 🚧 IN PROGRESS (core done, one gate item unverified)

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
- [ ] No layout shift/jank on load with 10+ notes on the board — **not verified**: no seeded dataset of that size exists yet to test against; each card is a plain absolutely-positioned DOM node with no virtualization, so it should scale fine, but confirm with real data before checking this off

Note: position writes are fire-and-forget (`.catch` logs, doesn't block or roll back the UI) — acceptable for a single-user local edit, but if multi-device sync matters later, revisit for conflict handling.

---

## Phase 4 — Templates library 🚧 IN PROGRESS (built, not yet verified against live LLM calls)

**Goal:** Real template system — the six presets, clone-and-customize, and fully custom templates from scratch.

**Touches:** `templates` collection, template editor UI, prompt generation (must now read the schema dynamically, not a hardcoded string)

**Build:**
- [x] Six preset templates seeded (SOAP, meeting minutes, 1:1, journal, interview, lecture) — `supabase/migrations/004_seed_preset_templates.sql`. `fieldlog` from the prototype deliberately stays a user-buildable custom template, not a 7th preset, per the spec's "six presets" language. **Requires running this migration against the real Supabase project before presets appear** — not yet applied, no DB credentials available in the dev session that built it.
- [x] Clone a preset → edit fields → save as a new template — `app/templates/page.tsx`, `components/templates/{TemplateEditor,FieldBuilder}.tsx`, `app/actions/templates.ts` (`cloneTemplate`)
- [x] Build a template from scratch: field builder supports all 7 types (text / longtext / checklist / tags / list / date / number / select), required flag, options for `select`, reorder via up/down
- [x] Restructuring prompt now generated from whichever template is active — `lib/prompts/dynamicTemplate.ts` (`buildTemplateSchema`, `buildTemplatePrompt`) maps each field type to a Zod type and a prompt instruction; `lib/ai/restructure.ts` takes an optional template and falls back to the exact original Phase 2 hardcoded Meeting Minutes path when none is given, so nothing regressed
- [x] Template can be picked before capture (`CaptureModal` picker) or applied after (`NoteCard`'s "⚙" affordance → `applyTemplateToNote`, which re-runs restructuring against the newly chosen template)

**Exit gate:**
- [ ] All six presets restructure correctly, each producing output matching its own schema — **not verified against live Gemini/Groq calls yet**; verified structurally only (schema generation, `tsc`/`build` clean). Do a real manual smoke test — paste a rough note through each of the six presets — before checking this off.
- [ ] A newly created custom template (not a preset) restructures correctly on the first real attempt — same caveat, needs a live test, this is the actual test of whether the dynamic-prompt approach works, not a formality
- [x] Picking a template after capture (not before) restructures the already-saved raw text correctly — `applyTemplateToNote` updates `notes.template_id` and re-triggers `restructureNoteAction`, structurally verified (build-clean); still worth confirming once against a live capture
- [ ] Zod validation genuinely fails and recovers for at least one deliberately malformed case per field type in use — not yet tested; the repair-retry path is unchanged from Phase 2 and dynamic schemas reuse the same `tryParseAndValidate`/repair-prompt flow, but no deliberate malformed-case test has been run against the new per-type schemas

**Before closing this phase:** (1) run `004_seed_preset_templates.sql` against Supabase, (2) do a real paste-capture smoke test through all six presets plus one custom template, (3) provoke at least one malformed-JSON case per field type actually in use and confirm the repair retry recovers it.

---

## Phase 5 — Search & filters

**Goal:** Structured filters plus full-text search across finished notes.

**Touches:** indexed attributes, Appwrite fulltext index on concatenated search field, filter UI, chip bar

**Build:**
- Filter by tag, date range, template, title
- Full-text search across concatenated search field (title + raw_text + structured body) using PostgreSQL full-text search
- Non-matching notes fade/hide on the board rather than the board re-laying-out jarringly

**Exit gate:**
- [ ] Each filter type returns correct results against a seeded set of at least 8 varied notes
- [ ] Full-text search finds a phrase that only appears inside a structured field value, not just in the title (note: phrase matching requires quotes due to MariaDB tokenization)
- [ ] Combining two filters (e.g. tag + date range) narrows correctly, not just applies the last one

---

## Phase 6 — Audio capture

**Goal:** Recording, live transcript, and the Whisper cleanup pass.

**Touches:** MediaRecorder integration, Web Speech API integration, audio blob storage (Supabase Storage), Groq Whisper call

**Build:**
- Record button → MediaRecorder captures audio locally
- Live transcript via Web Speech API where supported
- On stop, audio blob uploaded to a private storage bucket
- Async Whisper cleanup pass replaces/improves the live transcript once it returns
- Graceful behaviour where Web Speech isn't supported (Safari/Firefox) — recording still works, transcript just arrives later via Whisper only

**Exit gate:**
- [ ] Recording produces a stored audio blob accessible only via a signed URL, never a public path
- [ ] Live transcript appears while recording in a supporting browser
- [ ] In a non-supporting browser (or with Web Speech disabled), recording still completes and a transcript still arrives via Whisper
- [ ] The restructuring pipeline from Phase 2 runs correctly on a Whisper-sourced transcript, unchanged

---

## Phase 7 — Enrichment pass (tags + action items)

**Goal:** The second LLM call — auto-tagging and action-item extraction — running as a genuinely separate pass from restructuring.

**Touches:** enrichment route handler, `tags`/`note_tags`, `action_items`, global action-item list UI

**Build:**
- Second call takes the *structured* body (not raw text) and returns suggested tags + extracted action items
- User confirms/edits suggested tags before they're saved as confirmed
- Action items appear both inline on the note and in a cross-note global list in the rail
- Enrichment failure does not affect the note or its restructured content

**Exit gate:**
- [ ] Forcing pass 2 to fail (mocked error) leaves the structured note from pass 1 completely intact
- [ ] Suggested tags are visually distinct from confirmed tags until the user acts on them
- [ ] Marking an action item done in the global list updates it inline on the note, and vice versa
- [ ] Enrichment genuinely runs as a second network call, not folded into the pass 1 prompt (check the actual request log, don't assume the code does what the comment says)

---

## Phase 8 — Version history 🚧 PARTIALLY PULLED FORWARD (2026-08-30)

**Pulled-forward note:** the detail drawer and re-run action landed as part of the dark-chrome board fidelity pass, reusing the existing `applyTemplateToNote` action from Phase 4. What's still missing is the "old versions remain readable / browse prior versions" piece — the drawer shows only the *latest* version, it doesn't yet let you browse back through `note_versions` history.

**Goal:** Raw ↔ structured toggle, and "re-run with a different template" as a real, non-destructive action.

**Touches:** `note_versions` read path, drawer/detail UI, re-run action

**Build:**
- [x] Detail view toggles between raw capture and current structured version — `components/board/Drawer.tsx`
- [x] "Re-run as [different template]" creates a **new** `note_versions` row — never overwrites an existing one — reuses `applyTemplateToNote`/`restructureNoteAction`, which always `INSERT`s into `note_versions`, never `UPDATE`s
- [ ] Old versions remain readable / browsable in the UI — **not built**; the drawer only ever shows the latest `note_versions` row, there's no version picker yet

**Exit gate:**
- [ ] Re-running a note through a second template leaves the first version's row untouched in the database — true by construction (insert-only), not manually re-verified against a live row this session
- [ ] The raw capture is provably never modified by any restructure or re-run — same: true by construction (`notes.raw_text` is never written to by any restructure path), not manually re-verified against a live row
- [ ] Switching between two prior versions in the UI shows genuinely different structured content, not the same cached response twice — **cannot pass yet**, there is no way to select a prior version in the UI at all

---

## Phase 9 — Board quality-of-life interactions 🚧 MOSTLY PULLED FORWARD (2026-08-30)

**Pulled-forward note:** the user asked for the full prototype's dark-chrome board fidelity ahead of schedule, which required building most of this phase's interaction set early. What actually landed, so this phase isn't re-built from scratch later:

- [x] Stack all / auto-arrange / one-level "Restore" undo — `app/board/page.tsx` (`toggleStack`, `autoArrange`, `restoreLayout`), client-side, skips pinned notes, snapshot-based restore, respects the active filter set (operates on `matches()`-filtered notes only)
- [x] Resize (width only, clamped) — session-local, unchanged from Phase 3
- [x] Collapse to header card — session-local, unchanged from Phase 3
- [x] Duplicate and delete with confirm — `duplicateNote`/`deleteNote` server actions (`app/actions/notes.ts`), `ConfirmDeleteModal.tsx`; delete cascades via the existing `notes` → `note_versions`/`action_items` `ON DELETE CASCADE` foreign keys from `001_base_schema.sql`
- [x] Pin/archive — **new** `pinned`/`archived` columns via `supabase/migrations/005_add_pinned_archived_to_notes.sql` (not yet applied to the real project — same manual-apply requirement as prior migrations), `updateNoteFlags` action, toast-with-undo on archive
- [ ] Board theme switch (felt/cork/slate/chalkboard) — **not built**, out of scope for this pass, genuinely still open

**Exit gate (reassessed against what actually landed):**
- [x] Stacking respects the active filter set — a filtered-out note never moves (structurally true by construction — `toggleStack`/`autoArrange` only reposition `matches()`-filtered, non-pinned notes)
- [ ] Un-stacking (or dragging a note out of the stack) restores its pre-stack position exactly — restore-via-button is wired; dragging a note *out* of a stack to auto-restore isn't a separate implemented behavior, only manual "Restore" is
- [x] Auto-arrange's "Restore layout" genuinely reverses it, once — same snapshot mechanism serves both stack and auto-arrange
- [ ] Deleting a note removes its action items and version history too — relies on the DB's `ON DELETE CASCADE`, which predates this session; not re-verified against the database this session (structural claim only)
- [ ] Theme switch changes the board surface only — not built, still open

Live interaction verification (drag/pin/archive/stack against a real logged-in session) has not been done — no test Supabase user/credentials exist in this environment. Structural + build verification only; do a real manual pass before fully closing this phase.

---

## Phase 10 — Export 🚧 MOSTLY PULLED FORWARD (2026-08-30)

**Pulled-forward note:** built alongside Phase 9 as part of the same dark-chrome fidelity pass.

**Goal:** Real Markdown/plain-text/image export; PDF stubbed with an honest "coming soon."

**Touches:** export menu, client-side generation, canvas-rendering library integration

**Build:**
- [x] Markdown and plain-text export, single note and whole (filtered) board — `lib/board/exportNote.ts`, no external library
- [x] Image export via `html2canvas` (confirmed a real, current package — `1.4.1` — before installing), single note and whole board
- [x] PDF path present in the export menu but explicitly says "coming soon" — no fake success state

**Exit gate:**
- [ ] Exported Markdown/text genuinely reflects the note's current structured content, including checklists and tags — built to do this structurally (walks the same per-template field data `NoteCard`/`Drawer` render), not yet manually diffed against a real exported file
- [ ] Image export produces a real downloadable file, not a broken canvas — not yet manually confirmed by actually opening a downloaded file in this session (Playwright can't easily assert on a triggered browser download); worth one real click-through before closing this phase
- [ ] Clicking "PDF" tells the user honestly that it isn't built yet — it does not silently fail or produce an empty file

---

## Deferred (P2 — do not build without explicit go-ahead)

Real-time collaboration, multi-speaker diarization, linked notes/backlinks, bulk import from other note apps, native/PWA mobile, due-date reminders, read-only sharing links. All are in the spec as intentionally out of v1 scope. If a task ever asks for one of these, treat that as worth double-checking before starting.
