# MANUAL_TESTING.md — NoteFlow

A start-to-finish manual pass, phase by phase, matching `PHASES_AND_GATES.md`. Each phase lists what to actually **do**, what **not** to do (or specific edge cases to poke at), and what a pass looks like. Several "Don't miss" items below are things that were genuinely broken and fixed during development — hit them on purpose, don't just do the happy path.

Test in this order: it's cumulative (Phase 4 needs Phase 2 working, etc.). Use a real account, not a half-configured one — sign up fresh for this pass if you can, so Phase 0's "empty state" is real.

---

## Phase 0 — Scaffolding & auth

**Do:**
- Visit `/` while logged out — should show the marketing landing page, not a blank screen or an error.
- Sign up with a real email + password on `/login` ("Create an account").
- Log in with that account.
- Visit `/board` while logged out (in an incognito window, or after logging out) — should redirect to `/login`, not show an empty board.
- Once logged in, click the topbar logo — should take you back to `/`.
- Click "Log out" in the topbar — should sign you out and land on `/login`.

**Don't miss:**
- Try `/templates` while logged out too — same redirect should apply.
- **The real cross-user test**: sign up a *second* account (different email), log in as it, and confirm you see an empty board — none of the first account's notes. This is the one item in the whole plan that's never actually been verified and matters most (it's a data-isolation guarantee, not cosmetic).

**Pass:** landing page loads logged-out, board/templates are unreachable without auth and redirect cleanly, logout actually works, a second account sees nothing from the first.

---

## Phase 1 — Paste capture

**Do:**
- Open "New capture" → Paste tab → paste a few rough sentences → Restructure.
- Confirm the note appears on the board immediately (even before restructuring finishes).
- Reload the page — the note should still be there.
- Capture a note with **no template selected** ("No template (Meeting Minutes default)") — should still save and restructure fine.

**Don't miss:**
- Paste something with line breaks and odd punctuation — confirm the raw text saved is byte-for-byte what you typed (check the drawer's "Raw capture" view).

**Pass:** note persists across reload, raw text is untouched, works with or without picking a template.

---

## Phase 2 — Restructuring pipeline

**Do:**
- Capture a real meeting-notes-shaped paragraph through the default (Meeting Minutes) template — confirm the resulting structured note actually matches the schema (summary, attendees, decisions, etc., not empty/garbage).
- Watch the note while restructuring is in progress — it should show raw text with a "Restructuring…" note, not a blocking modal, and the rest of the board stays interactive.

**Don't miss:**
- Force a fallback: temporarily unset both `GEMINI_API_KEY` and `GROQ_API_KEY` in `.env.local`, restart the dev server, capture a note. It should still save (raw text visible, structured version falls back to an "unstructured" body) instead of hanging or crashing. Put the keys back afterward.
- Check the drawer's version info shows a real `model_used`/`prompt_version`, not blank.

**Pass:** structured output matches the template schema; a provider outage degrades gracefully instead of breaking capture.

---

## Phase 3 — Board rendering & interaction

**Do:**
- Drag a note to a new position, reload the page — it should be exactly where you left it.
- Click a note that's behind another — it should come to front; reload — the stacking order should survive.
- Capture 10+ notes and confirm the board doesn't jank or shift layout on load.

**Don't miss:**
- Drag a note **rapidly, several times in a row** (this is exactly the pattern that used to throw "Cannot update a component ('Router') while rendering a different component" — open your browser/terminal console while doing this and confirm it stays clean).
- Click "bring to front" on several different notes back-to-back quickly.

**Pass:** position/z-order always persist correctly, no React/console errors during rapid interaction.

---

## Phase 4 — Templates library

**Do:**
- Go to `/templates`. Confirm all six presets (Meeting minutes, SOAP, 1:1, Journal, Lecture, Interview) are listed and are **not editable/deletable** (presets are read-only, clone-only).
- Clone a preset, rename it, add/remove/reorder a field, save. Capture a note through it — confirm the output matches the fields you defined.
- Build a template completely from scratch (all 7 field types: text/longtext/checklist/tags/list/date/number/select) and capture a note through it.
- On an existing note, use the "⚙" affordance to apply/change its template after capture — confirm it restructures against the new template.

**Don't miss:**
- Deliberately try to break one preset's restructuring with a deliberately garbled paste (e.g. random characters, no real content) — should still produce *something* saved (fallback), not an unhandled error.
- Confirm a preset genuinely can't be deleted or edited (button should be absent or disabled for presets).

**Pass:** all 6 presets + at least one custom template restructure correctly; template-after-capture works; presets stay read-only.

---

## Phase 5 — Search & filters

**Do:**
- With several notes captured (mix of templates, some restructured), search for a word that appears **only inside a structured field**, not the title. It should find it.
- Filter by template (rail), by tag chip, by date range (7/30 days) — each alone, then combine two at once (e.g. a template filter + a tag filter) and confirm the result is the intersection, not just the last filter applied.
- Clear all filters — everything should come back.

**Don't miss:**
- Search for something that matches nothing — board should show the empty-state message, not error out.
- Type into the search box rapidly (it's debounced 250ms) and make sure it doesn't flash-empty or lag badly.

**Pass:** search finds structured-field-only matches; filters combine correctly, not override each other.

---

## Phase 6 — Audio capture

**Do:**
- New capture → Record tab. Grant mic permission, record a short clip while talking, stop. Confirm a note appears with a placeholder/live transcript, then updates to the Whisper transcript shortly after.
- In a Chrome/Edge tab, confirm you see a **live transcript** appear while recording (Web Speech API).
- Play back the recording from the note's drawer ("▶ Play recording").
- Confirm the resulting note restructures normally afterward (same as any paste capture).

**Don't miss:**
- **Close the capture modal (Cancel, Escape, or click the backdrop) while a recording is actively in progress.** This used to crash with "Cannot access 'stopRecording' before initialization" — confirm the modal just closes cleanly and the mic indicator in your browser tab turns off.
- Try it in Firefox (no Web Speech API) — recording should still work and a transcript should still arrive, just later, via Whisper only, with no live text shown.
- Deny mic permission when prompted — should show an inline error, not crash the page.

**Pass:** recording, live transcript (where supported), Whisper fallback, and playback all work; closing mid-recording never crashes.

---

## Phase 7 — Enrichment (tags + action items)

**Do:**
- After a note restructures, wait a few seconds and check for suggested tags (dashed border, ✓/× buttons) and any extracted action items appearing on the card.
- Confirm a suggested tag (✓) — it should turn into a solid confirmed-tag chip. Reject another (×) — it should disappear entirely.
- Check the rail's "Open action items" list shows items from across all notes, and toggling one done there also updates it on the card/drawer (and vice versa).

**Don't miss:**
- Force an enrichment failure: unset both API keys again, capture and restructure a note, confirm the note's structured content is **completely fine** — only the tags/action-items step silently doesn't happen. Check your terminal for a logged error, not a crash.
- Confirm enrichment is a genuinely separate step: watch your terminal log during a capture — you should see two distinct calls (one for restructuring, one for enrichment), not one combined.

**Pass:** suggested/confirmed tags visually distinct and both act correctly; action items sync between card and rail; enrichment failure never touches the note's actual content.

---

## Phase 8 — Version history

**Do:**
- Open a note's drawer, toggle between "Structured" and "Raw capture" — raw should be exactly what you typed/said, never altered.
- Re-run a note against a **different** template (drawer → "Re-run as" → pick another template → Restructure again).
- Use the version picker (appears once a note has 2+ versions) to browse back to the first version — confirm it shows genuinely different content (and the correct old template's fields), not the same thing twice.

**Don't miss:**
- While viewing a non-latest version, try to check off a checklist item — the checkbox should be disabled (this is intentional, not a bug) rather than silently corrupting the current version's state.
- After re-running, confirm the *first* version's content is still intact when you switch back to it.

**Pass:** re-run never overwrites history; version picker shows real differences; raw capture is provably untouched.

---

## Phase 9 — Board quality-of-life

**Do:**
- Pin a note, archive a different one, duplicate a third, delete a fourth (with the confirm dialog).
- Stack all notes, then hit Restore — confirm they go back to their original positions. Try Auto-arrange too, then Restore.
- Switch board themes (felt/cork/slate/chalkboard) — the board surface and accent color should change; **note pin/paper colors per template should stay exactly the same** across all four themes.
- Try all the keyboard shortcuts on a focused/hovered note: `c` collapse, `p` pin, `a` archive, `f` bring to front, `o`/Enter open, `[`/`]` resize, Delete/Backspace confirm-delete, Escape close everything, `?` help.

**Don't miss:**
- **Pin a note, then immediately delete it while other actions are still in flight** (e.g. right after a drag) — this used to 500 with a Postgres error when a stale request landed after the note was already gone. Should just silently succeed/no-op, not error.
- Confirm a filtered-out (hidden) note never moves when you Stack or Auto-arrange.
- Delete a note and check (via Supabase dashboard, if you want to be thorough) that its action items and versions are actually gone too, not orphaned.

**Pass:** every action persists correctly across reload; rapid/overlapping actions on the same note never throw a 500; theme switch never touches template colors.

---

## Phase 10 — Export

**Do:**
- Export a single note as Markdown, then as plain text — open the downloaded file and confirm it reflects the note's actual current structured content (fields, checklist state, tags).
- Export the whole (filtered) board as an image — confirm a real PNG downloads and opens correctly.
- Click "PDF" in the export menu — should show an honest "coming soon" message, never a silent failure or an empty/broken file.

**Don't miss:**
- Apply a filter first, then export — confirm the export only includes the *visible* (filtered) notes, not everything.
- Try exporting with zero notes visible (all filtered out) — should show a clear "nothing to export" message, not an empty/broken file.

**Pass:** MD/TXT/image exports are real and accurate; PDF is honest about not being built; export respects active filters.

---

## Cross-cutting things to do once at the very end

- Do a full logout → login cycle again after all the above, confirm nothing about your account/data broke.
- Check your terminal/dev server log across the whole session for any uncaught errors, 500s, or React warnings you didn't already expect from the "Don't miss" sections above — anything new is a real bug worth reporting.
- If deploying to Vercel: repeat the Phase 0 and Phase 6 checks specifically (auth redirects and audio/mic permissions are the two most likely to behave differently in production vs. local dev).
