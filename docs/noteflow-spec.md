# NoteFlow — Technical Spec, Feature Chart & App Flow

**Version:** 0.1 (pre-build)
**Scope:** Web application, single-user, free-tier AI stack
**Status:** Board direction validated via HTML prototype; data layer and AI pipeline not yet built

---

## 1. One-paragraph summary

NoteFlow takes messy input — spoken or pasted — and turns it into a structured, searchable record shaped by a template the user picks (before or after capture). Structured notes live on a corkboard-style workspace where they can be dragged, pinned, and arranged freely. Every note keeps its raw capture alongside the AI version, so restructuring is never destructive.

---

## 2. Feature chart

Priority key: **P0** = required for a usable v1 · **P1** = v1 if time allows · **P2** = deliberately deferred

| # | Feature | Priority | Complexity | Depends on | Offline behaviour | Notes |
|---|---------|----------|-----------|------------|-------------------|-------|
| 1 | Paste capture | P0 | Low | — | Full — queues locally | Simplest path to a working note; build first |
| 2 | Audio capture + live transcript | P0 | Medium | Web Speech API | Degraded — audio records, transcript waits | Web Speech needs network in Chrome |
| 3 | Whisper cleanup pass | P1 | Medium | Groq API, audio blob storage | Queued | Optional accuracy upgrade over live transcript |
| 4 | LLM restructuring (pass 1) | P0 | Medium | Gemini + Groq fallback | Queued | Returns structured JSON matching template schema |
| 5 | Auto-tagging + action extraction (pass 2) | P0 | Medium | Same providers | Queued | Separate call; can fail without blocking the note |
| 6 | Template library (6 presets) | P0 | Low | Schema format | Full — schemas cached | Schemas are just JSON; ship them bundled |
| 7 | Clone & customize template | P0 | Medium | Template editor UI | Full | Field builder: name, type, required, order |
| 8 | Build custom template from scratch | P1 | Medium | Same as above | Full | Same editor, empty starting state |
| 9 | Corkboard: drag, pin, tilt, per-template styling | P0 | Medium | Position persistence | Full | Prototype already covers this |
| 10 | Z-index management (click/drag brings a note to front) | P0 | Low | #9 | Full | Just an integer per note; see §4.5 |
| 11 | Resize notes (width, per-note) | P1 | Low | #9 | Full | Stored alongside position; min/max clamped |
| 12 | Collapse a note to a header card | P1 | Low | #9 | Full | Boolean flag; CSS hides body, not a data change |
| 13 | Stack all notes into a neat pile | P1 | Low | #9, #10 | Full | Toggle; remembers prior layout to unstack |
| 14 | Auto-arrange (tidy into a grid) | P1 | Low | #9 | Full | Deterministic layout algorithm, see §4.5 |
| 15 | Restore layout (undo stack/arrange) | P1 | Low | #13, #14 | Full | Single-level snapshot, not full undo history |
| 16 | Board themes (felt / cork / slate / chalkboard) | P1 | Low | CSS custom properties | Full | Per-user preference, cosmetic only |
| 17 | Duplicate / delete a note (menu or right-click) | P1 | Low | #9 | Full | Standard QoL; delete needs a confirm step in real build |
| 18 | Snap-to-grid toggle while dragging | P2 | Low | #9 | Full | Off by default — the corkboard should feel loose |
| 19 | Multiple boards / categories | P1 | Low | — | Full | One board is fine for v1 if pressed |
| 20 | Filters (tag, date, template, title) | P0 | Low | Indexed columns | Full | Cheap DB queries |
| 21 | Full-text search inside note bodies | P0 | Medium | Postgres FTS | Partial — local index only | See §6 |
| 22 | Version history (raw ↔ structured) | P0 | Low | Append-only versions table | Full for reading | Never overwrite; always insert |
| 23 | Re-run with a different template | P0 | Low | #4, #22 | Queued | Creates a new version row |
| 24 | Action item list (global view) | P0 | Low | #5 | Full | Cross-note collected view + inline per-note |
| 25 | Due dates + reminders on action items | P1 | Low | Notification permission | Full (local) | Browser notifications, no server needed |
| 26 | Export note/board as image | P1 | Low–Med | Canvas rendering (e.g. html2canvas) | Full | Client-side only, no server round trip |
| 27 | Export (PDF / Markdown / plain text) | P1 | Low–Med | — | Full for MD/TXT | Markdown/text are real client-side generation; PDF needs a render lib |
| 28 | Share a note or board (read-only link) | P1 | Medium | Tokenised public route | No | See §5 for the security model |
| 29 | Real-time collaboration | P2 | High | CRDT or presence layer | No | Deliberately out of v1 |
| 30 | Multi-speaker diarization | P2 | High | Paid STT tier | No | Free tiers don't do this well |
| 31 | Linked notes / backlinks | P2 | Medium | #21 | Full | Natural fit once search exists |
| 32 | Bulk import (Notion, Apple Notes, Keep) | P2 | Medium | Parsers per source | Full | Batch through the same restructuring pipeline |
| 33 | Native/PWA mobile | P2 | Medium | PWA manifest + SW | — | Web-only for now, but build SW-ready |

---

## 3. App flow

### 3.1 Capture → pinned note (the main loop)

```
                    ┌──────────────────────────┐
                    │    New capture           │
                    └───────────┬──────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
        [ Record audio ]                    [ Paste text ]
              │                                   │
   MediaRecorder → audio blob                     │
   Web Speech API → live transcript               │
              │                                   │
              └─────────────────┬─────────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │  RAW CAPTURE saved       │  ← immutable, always kept
                    │  (text + optional audio) │
                    └───────────┬──────────────┘
                                │
                    Template chosen?
                     ┌──────────┴──────────┐
                    yes                    no
                     │                      │
                     │            pick one now, or leave
                     │            it unstructured and
                     │            apply a template later
                     └──────────┬───────────┘
                                │
                    ┌───────────▼───────────────────┐
                    │ PASS 1 — Restructure          │
                    │ Gemini → template JSON schema │
                    │ (fallback: Groq on 429)       │
                    └───────────┬───────────────────┘
                                │
                    ┌───────────▼───────────────────┐
                    │ PASS 2 — Enrich               │
                    │ suggested tags + action items │
                    │ (failure here is non-fatal)   │
                    └───────────┬───────────────────┘
                                │
                    ┌───────────▼───────────────────┐
                    │ Review screen                 │
                    │ • confirm/edit suggested tags │
                    │ • confirm extracted to-dos    │
                    │ • re-run w/ different template│
                    └───────────┬───────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  PINNED TO BOARD      │
                    │  styled by template   │
                    └───────────────────────┘
```

### 3.2 Retrieval flow

```
Search bar ──► structured filters (tag · date · template · title)
     │              └─► indexed DB query, instant
     └──────────► full-text ──► Postgres tsvector over structured body + raw
                                   │
                                   └─► results highlight on board
                                       (non-matching notes fade out)
```

### 3.3 Version flow

```
note
 └─ raw_capture (never modified)
 └─ version 1 → template: meeting_minutes   ← superseded
 └─ version 2 → template: 1:1_notes          ← current
                       │
        "Re-run as SOAP note" ──► version 3, versions 1–2 still readable
```

Plain-language version: nothing the AI produces ever replaces what you actually said. Each restructure is a new layer stacked on top, and you can always drop back down to any earlier one — including the original mess.

---

## 4. Technical spec

### 4.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | Server actions handle API keys server-side; route handlers for the AI calls |
| Database | Appwrite Databases | String attributes for flexible JSON bodies (up to 4GB), fulltext index for search, document permissions for security |
| Auth | Appwrite Auth | Ships with permissions integration; no custom session handling |
| File storage | Appwrite Storage | Audio blobs, private bucket, signed URLs only |
| LLM (primary) | Gemini free tier | Restructuring + enrichment |
| LLM (fallback) | Groq | Triggered on 429/5xx; also hosts Whisper for the STT cleanup pass |
| STT (live) | Web Speech API | Zero cost, zero latency, no server round trip |
| STT (cleanup) | Whisper via Groq | Higher accuracy on the stored audio, run async |
| Client state | IndexedDB + a sync queue | Offline capture and local search |

### 4.2 Data model

**JSONB translation decision:** Appwrite does not have a native JSON/object attribute type. Flexible fields (templates.fields, notes.position, note_versions.body) are stored as String (longtext) attributes with JSON-stringified content. String attributes support up to 4GB, sufficient for note bodies and template schemas. This preserves flexibility for Phase 4 custom templates. Cost: database-level querying inside JSON is not possible; Phase 5 search uses a concatenated approach.

**Collections and attributes:**

```
users (Appwrite Auth users collection)
  $id, email, $createdAt

templates
  $id, user_id ($id from users, null = system preset), name, icon_color,
  fields (String, JSON array), is_preset, $createdAt
  # fields shape: [ { key, label, type, required, order, options } ]
  # field types: text | longtext | checklist | tags | list | date | number | select

notes
  $id, user_id, board_id, template_id (nullable),
  title, note_date,
  raw_text, audio_path (nullable), transcript_source (webspeech|whisper|typed),
  position (String, JSON object), search (String, concatenated content),
  $createdAt, $updatedAt
  # position shape: { x, y, rotation, z_index, width, collapsed }
  # search: title + raw_text + structured body concatenated, fulltext index

note_versions                       -- append-only
  $id, note_id, template_id, body (String, JSON object),
  model_used, prompt_version, $createdAt
  # current version = MAX($createdAt) per note

tags
  $id, user_id, name
note_tags
  note_id, tag_id, status (suggested|confirmed)

action_items
  $id, note_id, user_id, text, due_date, status (open|done),
  source (extracted|manual), $createdAt

boards
  $id, user_id, name, theme (felt|cork|slate|chalk), $createdAt

shares                              -- v1 read-only sharing
  $id, resource_type (note|board), resource_id, token,
  expires_at, revoked_at, $createdAt
```

### 4.3 The two LLM passes

**Pass 1 — restructure.** Send the raw text plus the active template's field schema. Ask for JSON conforming exactly to that schema. Use the model's structured-output/JSON mode where available, and validate the response with Zod before writing it to the database.

**Pass 2 — enrich.** Send the *structured* body (not the raw text — it's shorter and cleaner, so it's cheaper) and ask for two arrays: suggested tags and extracted action items with optional due dates.

Plain-language version: the first call decides what shape the note takes. The second call reads that tidy note and pulls out the labels and to-dos. Splitting them means a failure in the second step still leaves you with a perfectly good note — you just tag it yourself.

### 4.4 Free-tier resilience

| Concern | Handling |
|---|---|
| Rate limit (429) | Retry once with jitter → switch to Groq → queue with a "Restructure pending" note state |
| Malformed JSON | One repair retry with the validation error appended to the prompt; then fall back to storing the note unstructured with the raw text visible |
| Latency | Restructuring runs as a background job, not a blocking modal — the raw note is pinned to the board immediately and fills in |
| Cost creep | Per-user daily call counter in the DB; soft cap with a clear in-app message rather than a silent failure |
| Prompt drift | `prompt_version` stored on every version row, so a bad prompt change is traceable and re-runnable |

### 4.5 Board interaction mechanics

These are all client-side and local-first — none of them need a server round trip except the final position save, which is one small debounced write.

**Z-index.** One `z_index` integer per note plus a per-board running counter kept in memory. Any interaction (click, drag start, right-click) bumps the note's `z_index` to `counter + 1` and re-assigns `counter`. Persisted alongside position so the front-to-back order survives a reload — otherwise every refresh would silently reshuffle the pile, which breaks the "this is a real desk" feeling the corkboard is going for.

**Collapse.** Purely a boolean + CSS. The full field data stays in memory and in the DOM; collapsing only hides it, so expanding is instant with no re-fetch. Good candidate for a keyboard shortcut later (e.g. spacebar on a focused note) since it's cheap.

**Resize.** Width only, height stays content-driven. Clamp to a min/max (roughly 200–380px in the prototype) so a note can't be shrunk illegible or stretched into a poster. Store as a plain number, not a CSS string, so it round-trips cleanly through the API.

**Stack.** A toggle, not a one-way action. Stacking snapshots every visible note's current `{x, y, rotation}` before moving them into a tight cascade at a fixed anchor point with rising z-index, so the most recently stacked note is visually on top. Un-stacking (or dragging any note back out) restores the snapshot. Only *visible* notes (respecting active filters) get stacked — stacking should never silently move a note the user has filtered out of view.

**Auto-arrange.** A deterministic grid pack: column count derived from board width, notes placed left-to-right/top-to-bottom with `rotation: 0` and a fixed card width. This is a genuine rearrangement (not reversible by re-clicking the same button), so it takes its own snapshot first and exposes a single "Restore layout" action. Keep this a one-level undo — a full undo stack is a P2 nicety, not a v1 requirement.

**Themes.** Four CSS custom-property sets (felt, cork, slate, chalkboard) swapped at the root. Cosmetic only — template pin/stock colors stay constant across themes on purpose, since those colors are what make the board scannable by note type; only the board *surface* changes.

**Duplicate / delete.** Duplicate deep-copies the note's current structured body (not a new AI call) and inserts it with a fresh ID and a nudged position. Delete needs a real confirm step in production (the prototype skips it for speed) since it also has to cascade to that note's action items and version history — see §5 for the cascade behaviour.

---

## 5. Security

| Area | Approach |
|---|---|
| API keys | Server-side only. Every AI call goes through a Next.js route handler — no key ever reaches the browser |
| Data isolation | Appwrite document permissions on every collection. Role.user(userId) for read/update/delete on document creation ensures users can only access their own data |
| Audio files | Private storage bucket, short-lived signed URLs, never public paths |
| Sharing | Random 128-bit token, read-only route, revocable, with an optional expiry. Shared views strip action items and version history by default |
| Sensitive content | Users may put clinical or personal notes in here. Ship a per-note "don't send to AI" flag that keeps the raw capture local-only, and a clear data-handling page stating that content is sent to a third-party model |
| Deletion | Hard delete cascades to versions, action items, and the audio blob. Not just a soft-delete flag |
| Rate limiting | Per-user limits on the AI routes to stop a compromised session burning the free tier |
| Transcription privacy caveat | Web Speech API in Chrome sends audio to Google's servers — it is *not* on-device. Say so plainly in the UI rather than implying local processing |
| Input handling | Treat model output as untrusted: sanitize before rendering, never render raw HTML from a model response |

---

## 6. Offline friendliness

Design target: **capture always works offline; AI work queues; search degrades gracefully.**

| Capability | Offline | Mechanism |
|---|---|---|
| Paste a note | ✅ Full | Written to IndexedDB, synced on reconnect |
| Record audio | ✅ Full | MediaRecorder writes the blob locally |
| Live transcript | ⚠️ Degraded | Web Speech needs network in Chrome; audio is kept and transcribed later |
| Restructure | ⏳ Queued | Note appears on the board in a "raw" state with a pending badge |
| Read existing notes | ✅ Full | Last-synced notes cached locally |
| Board drag/arrange | ✅ Full | Position changes queue and sync |
| Stack / auto-arrange / resize / collapse / z-index | ✅ Full | All pure client-side state, same sync path as drag |
| Board theme switch | ✅ Full | Local preference, no server needed at all |
| Filters | ✅ Full | Run against the local cache |
| Full-text search | ⚠️ Partial | Appwrite fulltext index on concatenated search field (title + raw_text + body) for online; local index (MiniSearch/FlexSearch) over cached notes for offline |
| Export MD/TXT | ✅ Full | Client-side generation |
| Export image | ✅ Full once cached | Canvas-rendering lib (e.g. html2canvas) ships in the app bundle, so it works offline after first load |
| Sharing | ❌ | Needs the server |

**Sync strategy:** last-write-wins per field, with the raw capture immutable so the only genuinely conflicting fields are position and manual edits. Add a service worker early even if the PWA install prompt comes later — retrofitting offline is far more painful than building for it.

---

## 7. Future integrations (build so these stay cheap)

| Integration | Enabled by | What to do now |
|---|---|---|
| Calendar (Google/Outlook) — attach notes to meetings | `note_date` + a nullable `external_ref` attribute | Add `external_ref` (String, JSON object) to `notes` collection now |
| Task tools (Todoist, Linear, Notion) — push action items out | `action_items` is already a first-class collection | Keep `source` and add `external_id` |
| Bulk import from other note apps | Same restructuring pipeline | Make the restructure job accept a batch, not just one note |
| Mobile PWA | Service worker + manifest | Keep all capture logic browser-API-based, not desktop-only |
| Collaboration | `boards` already separate from `notes` | Appwrite has native Realtime which could simplify this when built; don't hardcode `user_id` as the sole ownership check on boards |
| Diarization | Paid STT tier | Store the audio blob permanently so old recordings can be reprocessed later |
| Paid model tier | `model_used` on versions | Make the provider a config value, not a hardcoded client |

---

## 8. Feasibility read

**Realistic v1 scope (P0 only):** paste + record capture, one restructuring pass, one enrichment pass, six presets plus cloning, the corkboard, filters, full-text search, version history, and the action-item list.

**The three risky bits, in order:**

1. **Template-shaped JSON that's actually reliable.** Custom user templates mean the schema is dynamic, so the prompt has to be generated from the template definition and validated against it. Budget real time here — this is the core of the product working or not.
2. **Free-tier rate limits under any real usage.** Two calls per note adds up fast. The queue + fallback design in §4.4 isn't optional polish; it's what stops the app feeling broken on day one.
3. **Web Speech API inconsistency.** Chrome and Edge are fine, Safari is partial, Firefox has no support. Plan for MediaRecorder + Whisper as the actual baseline, with live transcript as a nice-to-have on browsers that support it.

**Not risky:** the board, including the newer interactions (stack, auto-arrange, resize, collapse, z-index, themes, image export). The prototype now proves all of these too — they're state changes on numbers and booleans plus CSS, with the single exception of image export, which pulls in a canvas-rendering library (e.g. html2canvas) but stays entirely client-side. None of this touches the AI pipeline or the schema risk in point 1 above, so it's safe to build in parallel with the riskier work rather than gating on it.

**Suggested build order:** paste → restructure with one hardcoded template → board rendering (drag, z-index, stack/arrange, resize, collapse, themes) → templates library → search/filters → audio → enrichment pass → version history UI → export (MD/TXT/image, then PDF).
