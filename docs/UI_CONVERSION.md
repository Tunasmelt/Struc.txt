# UI_CONVERSION.md — DC prototypes → Next.js/React

Source reviewed: `Struc_txt_Board_dc.html`, `Struc_txt_Site_dc.html`, `support.js`, `seed.js`, `tokens.js`. This doc is the conversion map for turning those five files into real Next.js components. Hand it to whichever agent does the port — it's meant to be followed step by step, not summarized further.

---

## 0. Read this before anything else — two things changed since the last docs were written

**1. These files supersede `docs/noteflow-board-prototype.html`.** `AGENTS.md` §0 and §7 currently point at that file as the visual/interaction source of truth. It's stale. The two `_dc.html` files plus `tokens.js` and `seed.js` are now the real reference. Update those pointers in `AGENTS.md` once this conversion starts — an agent reading the old pointer will build the wrong thing.

**2. The design itself moved.** The old prototype was a skeuomorphic corkboard — tilted paper, round pins, felt/cork/slate/chalk board "materials." These new files are a flatter, modern card UI: `10px` border-radius, no rotation, no pin graphic, a plain drop shadow, and a **light/dark appearance toggle** instead of the four board-material themes. Confirmed directly in `tokens.js`:

```js
var MODE_CARD = { radius: "10px", padding: "14px 16px 14px", tilt: false, pin: false, sheen: false };
```

...and in the comment above `MODES`:

> "The board is the modern flat treatment in both appearances... The prototype's corkboard values stay in BASE/THEMES above so the validated design is still recoverable, but no longer ships as a mode."

So: `THEMES` (felt/cork/slate/chalk) and the corkboard token values still exist in `tokens.js` but are dead code as far as these two prototypes are concerned — nothing in either file calls `applyTheme()`. Only `applyMode('light' | 'dark')` is wired up. **Don't port the theme picker as a live feature** — the UI doesn't use it. Flag this as a product decision to confirm, not something to silently resolve either direction: `PHASES_AND_GATES.md` Phase 9 still lists "Board themes (felt/cork/slate/chalkboard)" as a deliverable. That phase needs a decision — keep light/dark only, or bring the theme picker back — before it's built.

Everything below assumes the **current** files (flat cards, light/dark) are what's being ported.

---

## 1. What these files actually are

They're not hand-written HTML — they're exported from a browser design tool that compiles a custom template format ("DC" — Design Component) through a runtime (`support.js`, labeled `// GENERATED from dc-runtime/src/*.ts`) into React elements at preview time. Structure of each file:

- `<x-dc>...</x-dc>` — the template. `{{ expr }}` bindings, `<sc-if>`/`<sc-for>` control flow, `style-hover="css"` for hover states, `onClick="{{ handler }}"` binding to methods.
- `<script type="text/x-dc" data-dc-script data-props="...">` — a `class Component extends DCLogic` with real state, lifecycle methods, and a `renderVals()` (Site) or equivalent computed-props pattern (Board) that produces everything the template binds to.
- `data-props` JSON — editor-exposed props (`screen`, `appearance`, `snapToGrid`) with types and defaults. This is the closest thing to a component prop contract already written.

None of the DC scaffolding (`x-dc`, `support.js`, the `DCLogic` base class) ships to production. It only exists so the design tool can live-preview the file. The conversion target is plain React/Next.js — `support.js` is not a dependency to carry forward, it's a reference for *how the current file behaves*, so the port matches it exactly.

---

## 2. Source → target file map

| Source | Becomes |
|---|---|
| `Struc_txt_Site_dc.html` | Three real routes (see §5) — not one component with internal screen state |
| `Struc_txt_Board_dc.html` | `app/board/page.tsx` (client) + ~12 components under `components/board/` |
| `tokens.js` | `styles/tokens.css` (the `:root` variables, nearly verbatim) + `lib/tokens.ts` (typed constants for use in logic — `TEMPLATES`, `MODES`, etc.) |
| `seed.js` | `lib/seed.ts` (typed dev fixtures — matches `docs/noteflow-spec.md` §4.2's `note_versions.body` shape, see §8) |
| `support.js` | Nothing ships. Its behavior (specifically the `style-hover` mechanism, §6.1) informs *how* to write the CSS, but the file itself is not ported |

---

## 3. Syntax conversion table

| DC primitive | React equivalent |
|---|---|
| `{{ expr }}` in text position | `{expr}` |
| `{{ expr }}` in attribute position | `{expr}` (already valid JSX) |
| `<sc-if value="{{ cond }}">...</sc-if>` | `{cond && (...)}` or extract to a small conditional sub-component if the block is large |
| `<sc-for list="{{ items }}" as="x">...</sc-for>` | `{items.map(x => (...))}` — add a real `key` (the DC version has no explicit key; use `x.id` or the field's natural key) |
| `onClick="{{ handler }}"` | `onClick={handler}` |
| `style="{{ styleObj }}"` | `style={styleObj}` if it's staying inline, but see §6.2 — most of these should become CSS classes instead |
| `style-hover="background:...;border-color:..."` | A CSS class with a real `:hover` rule — see §6.1, this is the one that needs an actual approach decision, not a mechanical swap |
| `class Component extends DCLogic { constructor() { this.state = {...} } }` | `useState`/`useReducer` per piece of state, or one Zustand store for Board (see §4) |
| `componentDidMount() {...}` | `useEffect(() => {...}, [])` |
| `componentWillUnmount()` cleanup | The cleanup function returned from that same `useEffect` |
| `this.setState(x)` | The store's setter, or `setX(...)` |
| `this.setState(prevState => ({...}))` (functional update) | Same functional-update form works with `useState`'s setter or a Zustand `set((state) => ({...}))` |
| `data-props` JSON (editor prop schema) | A TypeScript `interface Props` with the same field names, types, and defaults |
| `hint-placeholder-count="7"` / `hint-placeholder-val="{{ ... }}"` | Design-tool-only editor hints. Drop entirely — no React equivalent needed |

---

## 4. State model — Board

The Board component's `this.state` is one flat object with ~25 keys mixing three different lifetimes. Splitting them correctly matters more than the mechanical `useState` swap — putting drag/hover state in the same persisted store as note content would mean every pixel of mouse movement writes to `localStorage`.

| State group | Keys | Where it goes |
|---|---|---|
| **Persisted board data** | `notes` (array), `appearance`, `snapGrid` | Zustand store with the `persist` middleware, key `noteflow-board-v1` |
| **Persisted per-session UI** | *(none currently — `stacked`/`hasSnapshot` reset on reload today, keep that behavior)* | — |
| **Ephemeral UI state** | `filterTmpl`, `filterTag`, `filterRange`, `query`, `showArchived`, `sort`, `stacked`, `hasSnapshot`, `openId`, `showRaw`, `drawerOpen`, `ctx`, `hoverId`, `dragId`, `helpOpen`, `captureOpen`, `capMode`, `picked`, `recording`, `rawText`, `exportOpen`, `working`, `rerunKey`, `rerunBusy`, `confirmId`, `toast`, `toastAction` | Plain `useState` in the components that own them, or non-persisted slices of the same Zustand store — either works, but **do not let these hit the `persist` middleware's storage**, see §6.4 |
| **Instance-only, not state** | `this.zTop` (a running counter, never rendered) | A `useRef<number>`, not `useState` — it's mutated outside the render cycle exactly like the original |
| **Instance-only, not state** | `this.savedLayout` (the stack/arrange undo snapshot) | Also a `useRef`, same reasoning |

Recommended store shape:

```ts
// lib/store/board.ts
interface BoardStore {
  notes: Note[];
  appearance: 'light' | 'dark';
  snapGrid: boolean;
  updateNote: (id: string, patch: Partial<Note>) => void;
  bringToFront: (id: string) => void; // needs the zTop ref — see note below
  // ...duplicate, archive, reallyDelete, etc. — one action per mutation method on the original class
}
```

`bringToFront` needs `zTop`, which per the table above is a ref, not store state. Keep `zTop` as a module-level `useRef` in the component that also owns the store hook (or lift it into a small non-persisted store slice) — don't put it inside the persisted `notes` array's z-index bookkeeping in a way that recomputes it from scratch, or re-opening the app will lose the front-to-back order the moment two notes share a z-index after a bad merge.

---

## 5. Routing — the Site file's biggest real change

`Struc_txt_Site_dc.html` fakes navigation with `this.state.screen` (`'landing' | 'login' | 'signup'`) and `window.scrollTo(0,0)` on transition. That's a design-tool constraint (one file, one preview), not something to replicate. In Next.js this becomes real routes:

| DC screen state | Next.js route |
|---|---|
| `screen: 'landing'` | `app/page.tsx` |
| `screen: 'login'` | `app/login/page.tsx` |
| `screen: 'signup'` | `app/signup/page.tsx` |
| Header / footer (shared across all three) | `app/layout.tsx` |
| `this.go('login')` / `this.go('signup')` | `<Link href="/login">` / `router.push('/signup')` |

This gets you real back-button behavior, deep links, and the ability to server-render the landing page — none of which the state-toggle version had. The `auth` object's field lists (email/password vs. name/email/password) become two small `<AuthForm fields={...} />` usages rather than one component branching on `isLogin`/`isSignup`. The `notice` state (magic-link sent / "auth isn't wired up yet") stays local `useState` inside each auth page — it's genuinely ephemeral and page-scoped.

The **appearance toggle** (`light`/`dark`) is shared between the marketing site and the board and is the one piece of Site state that does need to persist and sync across routes — put it in `app/layout.tsx` via a small `ThemeProvider` reading/writing the same `noteflow-board-v1` key (see §6.4 for why that key needs care).

---

## 6. Design tokens

### 6.1 The `style-hover` problem — decide this before writing any component CSS

`support.js` implements `style-hover="background:X;border-color:Y"` by generating a scoped class and inserting a real `:hover { ... }` CSS rule into a `<style>` sheet at runtime (see `createPseudoSheet` in `support.js`). It is *not* a JS mouseenter/mouseleave handler faking a hover style — it's genuinely compiling to CSS. That's the right target in React too: **hover states need to be real CSS, not inline `style={{}}` objects**, because React inline styles can't express `:hover` at all.

Pick one:
- **CSS Modules** (`Button.module.css` with a `.brassBtn:hover { ... }` rule) — closest 1:1 mapping, no new dependency.
- **Tailwind** (`hover:bg-[var(--brass-hi)]`) — fine if the rest of the app is moving to Tailwind, but note the current styling is 100% inline-style objects, so this is a bigger rewrite than CSS Modules, not just a hover fix.

Either way, every `style="{{ x.style }}" style-hover="..."` pair in the DC files becomes: base styles as a class (or `style={{}}` for the parts that are genuinely dynamic per-note, like `left`/`top`/`zIndex`/`background: var(--stock)`), hover styles as a `:hover` rule in that same class. Don't try to keep the base styles inline and only move the hover state to CSS — split consistently per component so it's not a mix of two systems for one button.

### 6.2 Static vs. per-instance styles

A lot of the `style: {...}` objects computed in `renderVals()` are **static** — `btn()`, `chipStyle(on)`, `segStyle(on)`, `railStyle(on)`, `tabStyle(on)` all return the same handful of fixed variants regardless of note content. These should become CSS classes with variant modifiers (`.chip`, `.chip--active`) or a `cva`/`clsx`-style variant helper, not functions returning inline style objects re-created on every render.

The genuinely **per-instance** styles — a note's `left`, `top`, `width`, `zIndex`, `transform` during drag, and its template's `background`/`border` color — have to stay dynamic (either inline `style={{}}` for the numeric/positional ones, or CSS custom properties set inline: `style={{ '--stock': tpl.stock } as React.CSSProperties}` with the rest in a class that reads `var(--stock)`). The custom-property approach is what `tokens.js` already does for theme/mode switching — extend the same pattern to per-note color instead of introducing a second styling mechanism.

### 6.3 `tokens.js` → two files

`tokens.js` already does most of the right thing — CSS custom properties as the single source of truth, injected once. Split it:

- **`styles/tokens.css`** — everything in `VARS`, `MODES.light`, `MODES.dark` as real `:root` and `[data-mode="dark"]` CSS, not JS-injected `<style>` tags. Next.js can just import this as a global stylesheet; no need for `injectRoot()`/`applyMode()` to build CSS strings at runtime anymore since it's no longer serving a live-editable design tool.
- **`lib/tokens.ts`** — `TEMPLATES`, `THEMES` (kept, marked unused per §0), `TYPE`, `SPACE`, `RADII`, `SHADOWS` as typed exported constants, for anywhere logic needs the *value* (e.g. passing `getComputedStyle(...).getPropertyValue('--felt')` to `html2canvas`'s `backgroundColor` option, or picking `tpl.pin` for a dot's inline color).

`applyMode()` becomes much simpler — it's now just toggling a `data-mode` attribute (or a class) on `<html>`, with the CSS already defining both variants via attribute selectors. No more constructing `:root{...}` strings in JS.

### 6.4 The `noteflow-board-v1` localStorage key is shared — and shouldn't be, long-term

Both prototypes read/write the **same** `localStorage` key: the Board persists `{ layout, appearance }`, the Site persists/merges `{ appearance }` only (it reads first, spreads existing keys, sets `appearance`, so it doesn't clobber `layout` — verified in the Site script, `setAppearance`). That's careful enough to not break in the current two-file setup, but it's fragile as a pattern and doesn't extend to the real app:

- Short term (Phase 3/Phase 0.5, no auth yet): keep one `localStorage` key, but split it explicitly into two independent reads/writes — a `useAppearance()` hook that only ever touches `appearance`, and the board store that only ever touches `layout` — rather than one shared blob both features reach into. Same storage key is fine; shared *object* is not.
- Per `PHASES_AND_GATES.md`, once auth exists this stops being `localStorage` at all — `appearance` becomes a user preference (own column or a `boards.theme`-style field per `docs/noteflow-spec.md` §4.2) and note `layout` (`x, y, z_index, width, collapsed`) becomes the `notes.position` JSONB column already specified there. Don't build a deeper localStorage abstraction now if it's getting replaced by Phase 0/Phase 3's real persistence layer shortly after — a straightforward split is enough.

---

## 7. Interaction logic — port these exactly, don't "improve" them

These are the parts most likely to get quietly reinterpreted by a model that doesn't read closely. Each one has a specific behavior worth calling out before writing the hook.

**Drag (`onNoteDown`)** — native Pointer Events with `setPointerCapture`, not a DnD library. A 4px movement threshold decides drag-vs-click (`Math.abs(dx)+Math.abs(dy) > 4`). Releasing without having moved opens the note instead of committing a position. Dragging any note out of a stacked layout un-stacks the whole board (`if (this.state.stacked) this.setState({ stacked: false })`). Port as a `useNoteDrag(note)` hook returning an `onPointerDown` handler — don't reach for `@dnd-kit` or similar, it would change the feel and is more code than the ~25 lines this already is.

**Resize (`onNoteResize`)** — same pointer-capture pattern, width-only, clamped to `SPACE.noteWMin`/`noteWMax` from tokens. Stops propagation so it doesn't also trigger the drag handler on the same pointerdown.

**Keyboard shortcuts (`onKeyDown`)** — this is the part most worth reading twice. Target resolution is "whatever note is under the mouse cursor right now (`document.elementFromPoint`), falling back to whatever's keyboard-focused" — not "whatever's selected," there's no selection concept. Guards: typing in an `input`/`textarea`/`select`/contentEditable disables all shortcuts except `Escape` (which blurs the field). `Escape` globally closes every overlay (`captureOpen`, `drawerOpen`, `ctx`, `exportOpen`, `confirmId`, `recording`, `helpOpen`) in one `setState` call, before any other key is checked. Modifier keys (`metaKey`/`ctrlKey`/`altKey`) bail out entirely so the browser's own shortcuts aren't stolen. The full key map: `c` collapse, `d` duplicate, `e` export image, `p` pin, `a` archive, `f` bring to front, `o`/`Enter` open, `]`/`=`/`+` widen, `[`/`-` narrow, `Delete`/`Backspace` opens the confirm dialog (never deletes directly), `?` or `Shift+/` toggles the help overlay. Port as one `useKeyboardShortcuts()` hook attached once at the board's top level, exactly matching this precedence order.

**Context menu** — position is clamped to the viewport (`Math.min(x, window.innerWidth - 230)`), not centered on cursor. Right-clicking a note brings it to front *before* opening the menu (`bringToFront` then `setState({ ctx })`) — the menu target is always visually on top while it's open. Closes on outside click (checked via `closest('[data-nf="ctx"]')`) — reproduce with a click-outside hook or a portal + backdrop, either is fine as long as the "front the note first" ordering is preserved.

**Image export (`exportBoardImage` / `exportNoteImage`)** — `html2canvas` touches the DOM directly and only exists in the browser; both call sites already guard with `if (!window.html2canvas)`. In Next.js, load it with a dynamic import (`const html2canvas = (await import('html2canvas')).default`) inside the click handler rather than a static top-level import, so it never gets pulled into a server bundle. The board export explicitly reads the *current* `--felt` custom property value for the canvas background — if that variable goes away with the corkboard theme removal (§0), swap it for whatever the flat design's board background token ends up being (there's a `--felt`/`--felt-2` pair still defined in `MODES.light`/`MODES.dark`, so it likely still exists, just repurposed as the board's plain background rather than a "felt" surface — confirm the name before assuming).

**Toast with undo (`archive`)** — the undo action is a *closure* stored directly in state (`toastAction: () => this.updateNote(...)`), not a serializable action type. This is fine for plain `useState`, but if `toast`/`toastAction` end up in the same store as the persisted board data (§4 says they shouldn't), a function in state will break `JSON.stringify` the moment the persist middleware tries to serialize it. Keep toast state genuinely separate from anything with `persist` attached.

---

## 8. Data model — already lines up with the spec, keep it that way

`seed.js`'s note shape (`fields: [{ k, t, v }]` with `t` one of `text | prose | people | checks | outline`) matches `docs/noteflow-spec.md` §4.2's `note_versions.body` JSONB description closely enough that `lib/seed.ts` can become the literal shape your Phase 2 Zod schema validates against. Don't let the port drift the field-type union while translating — if a sixth field type gets added later (the spec's fuller list includes `date`, `number`, `select` per `PHASES_AND_GATES.md` Phase 4), add it to both the seed fixtures and the Zod schema together, not one file first.

`seed.js` itself stays exactly what it says it is in its own header comment — stand-in data for Phase 3/9 (board rendering + interaction), swapped for real Supabase-backed data once Phase 1/2 land. Don't wire it to anything persistent; it's dev fixtures.

---

## 9. Recommended file tree

```
app/
  layout.tsx                 # ThemeProvider (appearance), fonts, tokens.css import
  page.tsx                   # landing (was screen:'landing')
  login/page.tsx             # was screen:'login'
  signup/page.tsx            # was screen:'signup'
  board/page.tsx             # 'use client' — the whole interactive board

components/
  marketing/
    SiteHeader.tsx
    SiteFooter.tsx
    Hero.tsx
    HeroCardStack.tsx        # the 3 absolutely-positioned preview cards
    FeatureGrid.tsx
    TemplateChipRow.tsx
    ClosingCTA.tsx
    AuthCard.tsx              # fields-driven, used by both login/signup pages
    AppearanceToggle.tsx      # shared with board topbar
  board/
    Topbar.tsx
    Rail.tsx                  # template list + view filters + open action items
    ChipBar.tsx                # date range / tag / sort chips
    Board.tsx                  # the positioned canvas + grid background
    NoteCard.tsx
    NoteDrawer.tsx
    CaptureModal.tsx
    ContextMenu.tsx
    ConfirmDialog.tsx
    HelpOverlay.tsx
    Toast.tsx
  ui/
    Button.tsx                 # brass / ghost variants, replaces btn()/chipStyle()
    Chip.tsx
    Dot.tsx                    # the colored template-dot span

lib/
  tokens.ts
  seed.ts
  store/board.ts               # Zustand store, §4
hooks/
  useAppearance.ts
  useNoteDrag.ts
  useNoteResize.ts
  useKeyboardShortcuts.ts
  useClickOutside.ts
  useToast.ts
styles/
  tokens.css
types/
  note.ts
  template.ts
```

---

## 10. Before marking this phase done

- [ ] `AGENTS.md` §0/§7 updated to point at these files instead of the retired prototype HTML
- [ ] A decision recorded (in `HANDOFF.md`) on the felt/cork/slate/chalk theme picker — dropped, or reinstated alongside light/dark — before Phase 9 is built against it
- [ ] Every `style-hover` pair converted to a real CSS `:hover` rule, none left as inline-only
- [ ] `zTop` and `savedLayout` implemented as refs, not state, matching the original's instance-property behavior
- [ ] Toast/undo state kept out of anything passed to a persistence middleware
- [ ] Keyboard shortcut precedence (typing guard → Escape-closes-all → modifier bail-out → cursor-then-focus targeting) matches exactly, verified by testing each shortcut with a note under the cursor and again with one only focused
- [ ] `html2canvas` only ever dynamically imported, never in a server-rendered path
