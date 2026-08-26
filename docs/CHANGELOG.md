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

### Changed
- Updated AGENTS.md references from retired `docs/noteflow-board-prototype.html` to new prototype files (phase 0)
- **Architecture reversion:** Reverted backend from Appwrite back to Supabase (PostgreSQL, Auth, Storage) (phase 0)
  - Stack updated in AGENTS.md, noteflow-spec.md, PHASES_AND_GATES.md, CLAUDE.md, SETUP.md
  - Data model restored to PostgreSQL tables with JSONB columns
  - Full-text search restored to PostgreSQL tsvector on concatenated search field
  - Row-level security restored to PostgreSQL RLS policies
  - All Appwrite scaffolding removed and replaced with Supabase equivalents
  - Auth pages updated back to Supabase Auth
  - Environment variables updated to Supabase format
