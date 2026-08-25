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

## Phase 3 — Board rendering

**Goal:** Replace the plain list with the real corkboard, matching `prototype/Struc.txt Board.dc.html` — pinned/tilted notes, drag, z-index, position persistence.

**Touches:** board page/components, `notes.position` (x, y, rotation, z_index)

**Build:**
- Notes render pinned and tilted, styled per template (color/pin from the prototype's token set)
- Drag to reposition; position persists across reload
- Click or drag brings a note to front (z-index management per spec §4.5)
- Basic empty state

**Exit gate:**
- [ ] Visual side-by-side against the prototype HTML — same pin/tilt/paper feel, not a generic card grid
- [ ] Dragging a note, reloading the page, shows it in the same place
- [ ] Clicking a note behind another brings it to front, and that order survives a reload
- [ ] No layout shift/jank on load with 10+ notes on the board

---

## Phase 4 — Templates library

**Goal:** Real template system — the six presets, clone-and-customize, and fully custom templates from scratch.

**Touches:** `templates` collection, template editor UI, prompt generation (must now read the schema dynamically, not a hardcoded string)

**Build:**
- Six preset templates seeded (SOAP, meeting minutes, 1:1, journal, interview, lecture)
- Clone a preset → edit fields → save as a new template
- Build a template from scratch: name arbitrary fields, pick a type per field (text / longtext / checklist / tags / list / date / number / select)
- Restructuring prompt now generated from *whichever* template is active — this is the riskiest part of the whole build per the spec's feasibility read; budget real verification time here
- Template can be picked before capture or applied after, per spec

**Exit gate:**
- [ ] All six presets restructure correctly, each producing output matching its own schema
- [ ] A newly created custom template (not a preset) restructures correctly on the first real attempt — this is the actual test of whether the dynamic-prompt approach works, not a formality
- [ ] Picking a template after capture (not before) restructures the already-saved raw text correctly
- [ ] Zod validation genuinely fails and recovers for at least one deliberately malformed case per field type in use

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

## Phase 8 — Version history

**Goal:** Raw ↔ structured toggle, and "re-run with a different template" as a real, non-destructive action.

**Touches:** `note_versions` read path, drawer/detail UI, re-run action

**Build:**
- Detail view toggles between raw capture and current structured version
- "Re-run as [different template]" creates a **new** `note_versions` row — never overwrites an existing one
- Old versions remain readable

**Exit gate:**
- [ ] Re-running a note through a second template leaves the first version's row untouched in the database
- [ ] The raw capture is provably never modified by any restructure or re-run — verify this against the actual row, not just the UI
- [ ] Switching between two prior versions in the UI shows genuinely different structured content, not the same cached response twice

---

## Phase 9 — Board quality-of-life interactions

**Goal:** Stack, auto-arrange, resize, collapse, board themes, duplicate/delete — the interaction set already proven in `docs/noteflow-board-prototype.html`.

**Touches:** board component (position/z-index/collapsed/width fields already exist from Phase 3's schema)

**Build:**
- Stack all (toggle, snapshots layout, visible-notes-only per active filters)
- Auto-arrange (deterministic grid, one-level "Restore layout" undo)
- Resize (width only, clamped)
- Collapse to header card (boolean + CSS, no data change)
- Board theme switch (felt/cork/slate/chalkboard — cosmetic, template colors stay fixed)
- Duplicate and delete, with delete requiring a real confirm step and cascading to that note's action items and versions

**Exit gate:**
- [ ] Stacking respects the active filter set — a filtered-out note never moves
- [ ] Un-stacking (or dragging a note out of the stack) restores its pre-stack position exactly
- [ ] Auto-arrange's "Restore layout" genuinely reverses it, once
- [ ] Deleting a note removes its action items and version history too (verified against the database, not just the UI disappearing)
- [ ] Theme switch changes the board surface only — template pin/stock colors are unchanged across all four themes

---

## Phase 10 — Export

**Goal:** Real Markdown/plain-text/image export; PDF stubbed with an honest "coming soon."

**Touches:** export menu, client-side generation, canvas-rendering library integration

**Build:**
- Markdown and plain-text export, single note and whole (filtered) board
- Image export via canvas rendering, single note and whole board
- PDF path present in the UI but explicitly not implemented yet — no fake success state

**Exit gate:**
- [ ] Exported Markdown/text genuinely reflects the note's current structured content, including checklists and tags
- [ ] Image export produces a real downloadable file, not a broken canvas
- [ ] Clicking "PDF" tells the user honestly that it isn't built yet — it does not silently fail or produce an empty file

---

## Deferred (P2 — do not build without explicit go-ahead)

Real-time collaboration, multi-speaker diarization, linked notes/backlinks, bulk import from other note apps, native/PWA mobile, due-date reminders, read-only sharing links. All are in the spec as intentionally out of v1 scope. If a task ever asks for one of these, treat that as worth double-checking before starting.
