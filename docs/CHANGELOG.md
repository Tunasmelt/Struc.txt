# Changelog — NoteFlow

Format follows [Keep a Changelog](https://keepachangelog.com/). This file is **append-only** for anything under a dated release heading — never rewrite or delete a past entry, even if it turns out to describe a mistake. If something shipped in error, add a new entry that says so; don't erase the record.

**How agents should use this file:**
- Add one line per meaningful change under `[Unreleased]`, as it happens — not batched at the end of a session.
- Group by `Added` / `Changed` / `Fixed` / `Removed`. Skip a heading if there's nothing under it.
- Reference the phase number from `PHASES_AND_GATES.md` where relevant, e.g. `(phase 2)`.
- When a phase's exit gate is fully met, that's a natural point to cut a dated version and start a fresh `[Unreleased]` section — not mandatory, but a sane rhythm.
- Do not describe intent or plans here — only things that actually happened and are verifiable in the code. Planned work belongs in `PHASES_AND_GATES.md`, not here.

---

## [Unreleased]

### Added
- Product spec written (`noteflow-spec.md`)
- Board interaction/visual prototype built (`Struc.txt Board.dc.html`, `Struc.txt Site.dc.html`, `tokens.js`, `seed.js`)
- Phase and gate plan defined (`PHASES_AND_GATES.md`)
- Agent-facing docs created: `AGENTS.md`, `CLAUDE.md`, `HANDOFF.md`, this file
- Next.js app scaffolded with App Router, TypeScript, and Tailwind CSS (phase 0)
- Supabase client libraries installed (`@supabase/supabase-js`, `@supabase/ssr`) (phase 0)
- Base database schema defined: users, templates, notes, note_versions, tags, note_tags, action_items, boards with Row-Level Security (phase 0)
- Login/signup page with Supabase Auth integration (phase 0)
- Logout route handler (phase 0)
- Environment variable template in `.env.local` with placeholder names (phase 0)
- SETUP.md with complete Supabase project setup instructions (phase 0)
- Created database migration for user_id schema configuration and real RLS policies (phase 0/1)
- Completed paste capture UI layout rendering the CaptureForm and NoteList on the Home page (phase 1)
- Wired note creation Server Action to persist captured text in notes table (phase 1)
- Installed Zod (`zod`), Gemini SDK (`@google/genai`), and Groq SDK (`groq-sdk`) (phase 2)
- Created database migration `003_add_template_id_to_note_versions.sql` to add template_id reference to note_versions table (phase 2)
- Defined Meeting Minutes Zod schema, prompt versioning string (`v1.0-meeting-minutes`), and repair prompts (`lib/prompts/meetingMinutes.ts`) (phase 2)
- Implemented AI provider handler (`lib/ai/providers.ts`) supporting Gemini primary and Groq fallback with rate-limit and 5xx error catching (phase 2)
- Built AI restructuring pipeline (`lib/ai/restructure.ts`) with Gemini primary, Groq fallback, 1 repair retry on Zod validation failure, and unstructured fallback handling (phase 2)
- Built `restructureNoteAction` server action (`app/actions/restructure.ts`) saving structured JSON results to `note_versions` (phase 2)
- Updated `createNote` server action (`app/actions/notes.ts`) to initiate background restructuring without blocking note creation (phase 2)
- Enhanced `NoteList` component (`components/NoteList.tsx`) with status badges ("Restructuring...", "Structured"), raw ↔ structured toggle, model/prompt version metadata, and formatted Meeting Minutes field rendering (phase 2)
- Added restructuring unit and integration tests (`lib/ai/__tests__/restructure.test.ts`) (phase 2)
- Board UI implemented: `app/board/page.tsx`, `components/board/{Board,NoteCard,Rail,Topbar,CaptureModal,types}.tsx` — pinned/tilted note cards styled from the prototype's token set, template-filter rail with live counts, cross-note open-action-items list, and a paste-capture modal wired to `createNote` (phase 3)
- Ported prototype design tokens into `lib/tokens.ts` and `styles/tokens.css`; `app/layout.tsx` now loads the prototype's fonts via `next/font/google` and the `data-mode="light"` default (phase 3)
- Added `updateNotePosition` server action (`app/actions/notes.ts`) persisting drag and bring-to-front position/z-index changes to `notes.position`, closing the Phase 3 persistence gap (phase 3)
- Seeded the six spec-required preset templates via `supabase/migrations/004_seed_preset_templates.sql` (meeting minutes, SOAP, 1:1, journal, lecture, interview) (phase 4)
- Built dynamic per-template prompt/schema generation (`lib/prompts/dynamicTemplate.ts`), replacing the phase 2 hardcoded-only Meeting Minutes pipeline while preserving its exact behavior when no template is supplied (phase 4)
- Added template CRUD + clone server actions (`app/actions/templates.ts`) and a template editor UI (`app/templates/page.tsx`, `components/templates/TemplateEditor.tsx`, `components/templates/FieldBuilder.tsx`) supporting clone-a-preset and build-from-scratch with a 7-field-type builder (phase 4)
- Added `applyTemplateToNote` server action and a per-card template picker so a template can be chosen before capture or applied/changed after (phase 4)
- Generalized `NoteCard`'s structured-body rendering and `Rail`'s per-template counts/colors to work with any template's field list, not just the hardcoded meeting-minutes shape (phase 4)

### Added
- Public marketing landing page (`components/LandingPage.tsx`, rendered at `/` for guests) matching `prototype/Struc.txt Site.dc.html`'s landing screen: hero, 3-feature grid, seven-template chip row, CTA banner, footer
- Shared light/dark appearance persistence + toggle (`lib/appearance.ts`, `components/AppearanceToggle.tsx`), used by the landing page and login/signup
- `supabase/migrations/005_add_pinned_archived_to_notes.sql` adds real `pinned`/`archived` columns to `notes`, pulled forward from phase 9
- New server actions `updateNoteFlags`, `deleteNote`, `duplicateNote` (`app/actions/notes.ts`), all RLS-scoped to `user_id` (phase 9, pulled forward)
- Board detail drawer (`components/board/Drawer.tsx`) with raw↔structured toggle and "re-run as [template]" creating a new `note_versions` row (phase 8, partially pulled forward)
- Context menu, confirm-delete modal, help modal, and a toast system with undo for archive/delete (`components/board/{ContextMenu,ConfirmDeleteModal,HelpModal,Toast}.tsx`) (phase 9, pulled forward)
- Stack-all / auto-arrange / one-level restore, pin/archive, duplicate, delete-with-confirm, and keyboard shortcuts (c/p/a/f/o/[/]/Delete/Esc/?) on the board (phase 9, pulled forward)
- Markdown/plain-text export (`lib/board/exportNote.ts`, no library) and PNG export via `html2canvas` for a single note or the whole filtered board; PDF menu item stays a visible "coming soon" (phase 10, pulled forward)

### Changed
- Restyled the board (`Board`/`NoteCard`/`Rail`/`Topbar`) to the prototype's dark-chrome visual language (sticky filter bar with date-range/tag/sort chips, rail sections for templates/view/open action items, pin badges) instead of the earlier lighter "modern flat" treatment, per explicit user request to match the original prototype rather than the previously chosen direction

### Added
- Real Postgres full-text search (`searchNoteIds` in `app/actions/notes.ts`, using Supabase `.textSearch()` against the existing `notes.search` GIN index), debounced from the board's search box and combined with the existing tag/date-range/template filters (phase 5)

### Fixed
- `supabase/migrations/006_fix_search_trigger_and_fts.sql`: the phase 0 `update_notes_search_vector()` trigger referenced a nonexistent `notes.body` column (structured content lives in `note_versions.body`), which as written would error on every note insert/update; also added a trigger so a note's `search` column picks up its structured content once restructuring finishes, which nothing previously did (phase 5)
- `app/globals.css` used Tailwind v3's `@tailwind base/components/utilities` directives while the project runs Tailwind v4, which silently produced zero utility CSS — every Tailwind-styled page (login/signup included) rendered unstyled. Switched to `@import "tailwindcss"`.

### Changed
- Restyled `app/login/page.tsx` to match `prototype/Struc.txt Site.dc.html`'s auth screen (brand header, brass CTA, login/signup toggle, magic-link option) instead of the generic Tailwind placeholder from phase 0 scaffolding; still fully wired to real Supabase auth (password + magic link)
- Updated AGENTS.md references from retired `docs/noteflow-board-prototype.html` to new prototype files (phase 0)
- **Architecture reversion:** Reverted backend from Appwrite back to Supabase (PostgreSQL, Auth, Storage) (phase 0)
  - Stack updated in AGENTS.md, noteflow-spec.md, PHASES_AND_GATES.md, CLAUDE.md, SETUP.md
  - Data model restored to PostgreSQL tables with JSONB columns
  - Full-text search restored to PostgreSQL tsvector on concatenated search field
  - Row-level security restored to PostgreSQL RLS policies
  - All Appwrite scaffolding removed and replaced with Supabase equivalents
  - Auth pages updated back to Supabase Auth
  - Environment variables updated to Supabase format

### Fixed
- Recovered an interrupted Devin AI session on the board UI (phase 3): fixed a `useState` type-inference bug in `NoteCard.tsx` that broke resize under `tsc`, and reconnected `Rail.tsx`/`Topbar.tsx` to their parent page after they'd gained required props (`notes`, `filterTmpl`, `onFilterTmplChange`, `onOpenCapture`) with no caller supplying them, which had left template counts at zero and the "New capture" button dead
- Replaced a hand-written `<head>` Google Fonts injection in `app/layout.tsx` with `next/font/google`, avoiding duplicate/conflicting head tags across App Router navigations (phase 3)
