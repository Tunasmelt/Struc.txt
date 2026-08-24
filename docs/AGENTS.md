# AGENTS.md — NoteFlow

This file is read by coding agents (Windsurf, Gemini-based tools, and anything else that honours `AGENTS.md`) before touching this repo. It is the source of truth for stack, conventions, and boundaries. `CLAUDE.md` exists as a thin companion for Claude Code — it defers to this file, it does not replace it.

**Read this fully before writing any code. If anything here conflicts with what you were just asked to do, stop and flag the conflict instead of picking one silently.**

---

## 0. What this project is

NoteFlow is a voice-first note-taking app with AI restructuring. You paste or record raw text, it gets restructured into a template (Meeting Minutes, SOAP note, etc.), then enriched with suggested tags and extracted action items. Notes live on a corkboard UI with drag, filters, and version history.

**Visual/interaction source of truth:** `prototype/Struc.txt Board.dc.html`, `prototype/Struc.txt Site.dc.html`, `prototype/tokens.js`, `prototype/seed.js` (in prototype folder). When the board UI doesn't match the prototype, the prototype wins — fix the implementation, not the prototype.

Build order and gate checklist: `PHASES_AND_GATES.md`. Do not start work outside the current phase's file list without asking first.

---

## 1. Working rules (apply to every task, every model)

1. **One phase at a time.** Check `PHASES_AND_GATES.md` for the current phase before starting anything. Do not pull work forward from a later phase because it "seems related."
2. **Small diffs.** One feature or one file-group per change. If a task looks like it touches more than ~5 files, stop and break it into smaller steps before writing code.
3. **Verify before claiming done.** Run the actual build/test/lint command and show the real output. "This should work" is not a completion report. If you cannot run something in your environment, say so explicitly rather than asserting success.
4. **Check current docs before calling any external API.** Gemini, Groq, Supabase, and the Whisper endpoint all change their SDKs and model strings over time. Do not write API calls from memory — look up the current method signature first.
5. **Never invent stack choices.** The stack in §2 is fixed. If something in the spec seems to need a different library or service, ask before substituting one.
6. **Ask on ambiguity.** If a requirement isn't fully specified, stop and ask one specific question rather than guessing at the most elaborate interpretation. A wrong small guess is cheap to fix; a wrong big guess is not.
7. **Update the paper trail.** Every meaningful change gets a line in `CHANGELOG.md`. Every session gets an update to `HANDOFF.md`. These are not optional busywork — they're how the next session (possibly a different model) knows where things stand.

---

## 2. Stack (fixed — do not substitute)

| Layer | Choice |
|---|---|
| Framework | Next.js, App Router |
| Database | Appwrite Databases |
| Auth | Appwrite Auth + document permissions |
| File storage | Appwrite Storage (private buckets, signed URLs only) |
| LLM — restructuring & enrichment | Gemini (free tier), primary |
| LLM — fallback | Groq, triggered on 429/5xx from Gemini |
| Speech-to-text (live) | Web Speech API, browser-native |
| Speech-to-text (cleanup pass) | Whisper via Groq, async on the stored audio blob |
| Client-side offline store | IndexedDB + a sync queue |
| Schema validation | Zod, on every LLM response before it touches the database |
| Board image export | Canvas-rendering library (e.g. html2canvas), client-side only |

If a phase seems to need something not on this list, that's a signal to check the spec again before adding a dependency, not a green light to add one.

---

## 3. Repo conventions

- **Routes / server logic:** All AI provider calls go through server-side route handlers. No API key ever ships to the client. If you find yourself importing a Gemini or Groq SDK into a client component, stop — that's wrong.
- **Database access:** Appwrite client SDK is designed for direct browser calls with permissions handling security. Do not route ordinary database reads through Next.js server handlers "to be safe" — that's redundant and adds latency. Only AI provider calls require server-side handling.
- **Prompts:** Live in one place (`lib/prompts/`), not inlined at call sites. The restructuring prompt is generated *from* the active template's field schema — it is never a static string per template.
- **Validation:** Every LLM JSON response is parsed through a Zod schema before it's written anywhere. A response that fails validation gets one repair retry (append the validation error to the prompt), then falls back to storing the note unstructured with the raw text intact. It never silently gets discarded.
- **Migrations:** Appwrite collections are defined via SDK scripts or CLI (appwrite.json), not SQL. Collection/attribute definitions are version-controlled in `lib/appwrite/` or similar. Never modify a collection that has data in production without a migration script.
- **Env vars:** Reference by name only in code and docs (`GEMINI_API_KEY`, `GROQ_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`). Never hardcode a real key anywhere, including in comments, test fixtures, or commit messages.
- **Commits:** One logical change per commit. Reference the phase number, e.g. `phase-2: gemini restructuring pass with zod validation`.

---

## 4. The two-pass AI pipeline — do not collapse this into one call

Restructuring and enrichment are **two separate LLM calls**, on purpose:

1. **Pass 1 — restructure.** Raw text + active template's field schema → structured JSON matching that schema.
2. **Pass 2 — enrich.** The *structured* body from pass 1 (not the raw text) → suggested tags + extracted action items.

This is a deliberate design decision from the spec, not an oversight to "optimize away":
- Pass 2 failing should never take pass 1's note down with it — a note with no tags is fine, a note that vanished because tagging errored is not.
- Pass 2 reads the shorter, cleaner structured body, which is cheaper than re-sending the raw capture.
- Each pass gets its own retry/fallback handling and its own `prompt_version` for traceability.

If a task description ever implies merging these, treat that as a mistake in the instruction and ask before proceeding.

---

## 5. What NOT to touch without explicit instruction

- Document permissions — get these wrong and one user can read another user's notes. Always set Role.user(userId) for read/update/delete on document creation.
- Anything under a migration that's already been applied.
- Real-time collaboration, multi-speaker diarization, bulk import, PWA/mobile — all explicitly deferred (P2 in the spec). Don't scaffold these "while you're in there."
- The raw-capture-is-immutable rule. A restructure or re-run creates a *new* version document. It never edits or deletes `raw_text`.

---

## 6. Model-specific notes

### Gemini
- Use the model's structured-output / JSON-schema mode where the SDK supports it, rather than asking for JSON in a plain-text prompt and hoping.
- Confirm the current model name via the live docs before hardcoding it — free-tier model names get deprecated and renamed.

### Windsurf SWE-1 (slow model) — read this before starting any task
- Work strictly off the current phase's checklist in `PHASES_AND_GATES.md`. Don't self-assign follow-on work.
- One file or one tightly-scoped feature per turn. If the task feels like it wants to touch routing, the database, and the UI all at once, that's a sign to split it into three turns.
- Do not attempt a repo-wide refactor, rename, or restructure in one pass. Propose the plan first, get it confirmed, then execute in small steps.
- If a build or test command fails, stop and report the exact error rather than trying several speculative fixes in sequence — that tends to compound into a worse state that's harder for the next session to untangle.
- Prefer being told an exact file path over inferring one.

---

## 7. Where the rest of the context lives

- `docs/noteflow-spec.md` — full product spec, feature chart, data model, security, offline behaviour.
- `prototype/Struc.txt Board.dc.html`, `prototype/Struc.txt Site.dc.html`, `prototype/tokens.js`, `prototype/seed.js` — visual/interaction reference for the board (open Board.dc.html in a browser).
- `docs/UI_CONVERSION.md` — conversion map between the prototype files and the Next.js app.
- `docs/PHASES_AND_GATES.md` — the build order and what has to be true to move past each gate.
- `docs/HANDOFF.md` — current state, in-progress work, open questions. Read this first in any new session.
- `docs/CHANGELOG.md` — append-only record of what's shipped.
