-- Fixes a real display bug: NoteCard/Drawer showed "Restructuring…"
-- forever for any note with no structured version yet, regardless of
-- whether restructuring was ever actually requested (e.g. "Save as-is"
-- captures) — a note saved without restructuring looked permanently
-- stuck instead of just... saved. This column lets the UI tell "genuinely
-- pending" apart from "never asked for it".
--
-- Existing rows default to true (preserves current behavior for anything
-- captured before this migration, since we don't know their history).
ALTER TABLE notes ADD COLUMN IF NOT EXISTS restructure_pending BOOLEAN NOT NULL DEFAULT true;
