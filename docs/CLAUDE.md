# CLAUDE.md — NoteFlow (Claude Code companion)

This file exists in case Claude Code ends up working this repo instead of, or alongside, Windsurf/Gemini. It is deliberately thin — **`AGENTS.md` is the source of truth** for the stack, conventions, boundaries, and the two-pass AI pipeline shape. Read that file in full first. This file only adds what's specific to working in Claude Code.

If `AGENTS.md` and this file ever disagree, `AGENTS.md` wins — fix this file instead of trusting it.

---

## Why this file is short on purpose

The phase/gate structure in `PHASES_AND_GATES.md` was written to be model-agnostic — it works the same whether the agent working it is Claude, Gemini, or Windsurf's slow model. The extra scaffolding in `AGENTS.md` §6 for Windsurf-slow (atomic tasks, no self-assigned follow-on work, no repo-wide refactors in one pass) is less necessary here, since Claude Code can hold more of the spec and phase plan in context at once and has its own skill-based workflow for the same problems. That workflow is mapped below rather than re-explained.

---

## Skill mapping — which installed skill to reach for at each point

| Situation | Skill |
|---|---|
| Starting a new phase, or any non-trivial feature within one | `writing-plans` — turn the phase's goal + exit gate into a concrete plan before touching code |
| Executing an already-written plan, especially across a session boundary | `executing-plans` |
| Any ambiguity in a phase's scope, or a genuinely new feature idea | `brainstorming` — before implementation, not instead of the phase plan |
| Writing any feature or bugfix | `test-driven-development` — write the failing test first, matching the phase's exit gate criteria |
| A bug, test failure, or anything behaving unexpectedly | `systematic-debugging` — reproduce, isolate, diagnose, before proposing a fix |
| About to check off an exit gate item or claim a phase is done | `verification-before-completion` — run the actual command, show real output, don't assert |
| Before writing or editing any Gemini, Groq, Supabase, or Whisper API call | `api-check` — these SDKs and model names drift; don't write from memory |
| Isolating work on a phase without disturbing the current branch | `using-git-worktrees` |
| Multiple independent tasks within a phase (e.g. two unrelated template presets) | `dispatching-parallel-agents` or `subagent-driven-development` |
| A phase's exit gate is fully met and it's time to integrate | `finishing-a-development-branch` |
| Getting feedback on a change before it merges | `requesting-code-review` |
| Feedback comes back from a review | `receiving-code-review` — verify the feedback technically before implementing it, don't just comply |

---

## Reading order for a fresh Claude Code session

1. `docs/HANDOFF.md` — current state, what's done, what's next
2. `docs/PHASES_AND_GATES.md` — find the current phase, read its goal and exit gate
3. `docs/AGENTS.md` — stack, conventions, boundaries (skim if already familiar; re-read §4 on the two-pass pipeline every time, it's the easiest thing to accidentally collapse)
4. `docs/noteflow-spec.md` — full detail on whatever the current phase touches
5. `docs/CHANGELOG.md` — append to this as work happens, don't wait until the end of the session

Update `docs/HANDOFF.md`'s session log before ending the session, regardless of how far the phase got.
