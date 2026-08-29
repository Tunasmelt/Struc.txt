-- Phase 9 material pulled forward: pin/archive need to survive a reload,
-- so (unlike collapsed/width, which stay session-local per the Phase 3
-- precedent) they get real columns rather than local-only state.
ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS notes_pinned_idx ON notes (pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS notes_archived_idx ON notes (archived) WHERE archived = true;
