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
- Appwrite client libraries installed (`appwrite`, `node-appwrite`) (phase 0)
- Base collections/attributes defined: users, templates, notes, note_versions, tags, note_tags, action_items, boards with document permissions (phase 0)
- Login/signup page with Appwrite Auth integration (phase 0)
- Logout route handler (phase 0)
- Environment variable template in `.env.local` with placeholder names (phase 0)
- SETUP.md with complete Appwrite project setup instructions (phase 0)

### Changed
- Updated AGENTS.md references from retired `docs/noteflow-board-prototype.html` to new prototype files (phase 0)
- **Architecture pivot:** Migrated backend from Supabase to Appwrite (Databases, Auth, Storage) (phase 0)
  - Stack updated in AGENTS.md, noteflow-spec.md, PHASES_AND_GATES.md, CLAUDE.md
  - Data model translated from Postgres tables/columns to Appwrite collections/attributes
  - JSONB fields translated to String (longtext) attributes with JSON-stringified content (up to 4GB limit)
  - Full-text search approach changed to Appwrite fulltext index on concatenated search field
  - Row-level security replaced with Appwrite document permissions (Role.user(userId))
  - All Supabase scaffolding removed and replaced with Appwrite equivalents
- Updated `.env.local` with real Appwrite credentials (endpoint, project ID, API key) (phase 0)
- Verified build succeeds with real Appwrite credentials (phase 0)
- Dev server successfully running on localhost:3000 with real credentials (phase 0)
- Phase 0 exit gate fully met (except document permissions verification pending Phase 1) (phase 0)

<!--
Nothing has been built yet. The next entries should appear once Phase 0 (scaffolding) starts.

Example of a real future entry:

### Added
- Next.js app scaffolded, Supabase project connected (phase 0)
- Base schema migration: users, templates, notes, note_versions, tags, note_tags, action_items, boards (phase 0)

### Fixed
- Gemini structured-output call was returning malformed JSON on multi-line list fields; added repair-retry per spec §4.4 (phase 2)
-->
