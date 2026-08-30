-- Phase 5 (Search & filters): fixes a latent bug in the Phase 0 search
-- trigger and makes full-text search actually cover structured content.
--
-- Bug: update_notes_search_vector() referenced NEW.body, but `notes` has no
-- `body` column (structured content lives in note_versions.body). Every
-- insert/update of `notes` would raise "record 'new' has no field 'body'"
-- once Postgres actually evaluated that branch. Replaced with a version that
-- pulls the latest note_versions row via subquery instead.
CREATE OR REPLACE FUNCTION update_notes_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  latest_body TEXT;
BEGIN
  SELECT body::text INTO latest_body
  FROM note_versions
  WHERE note_id = NEW.id
  ORDER BY created_at DESC
  LIMIT 1;

  NEW.search := COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.raw_text, '') || ' ' || COALESCE(latest_body, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Restructuring lands as a new note_versions row asynchronously, after the
-- note itself was already inserted — nothing previously re-ran the notes
-- search trigger at that point, so a note's search column never picked up
-- its structured content. This touches the parent note (via updated_at) so
-- update_notes_search_vector() re-fires and re-derives search from the
-- latest version.
CREATE OR REPLACE FUNCTION touch_note_search_on_version()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE notes SET updated_at = NOW() WHERE id = NEW.note_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_note_search_after_version ON note_versions;
CREATE TRIGGER touch_note_search_after_version
  AFTER INSERT OR UPDATE ON note_versions
  FOR EACH ROW
  EXECUTE FUNCTION touch_note_search_on_version();

-- Backfill: recompute search for existing notes now that the function no
-- longer references the nonexistent column, so rows written before this
-- migration also get correct search content.
UPDATE notes SET updated_at = updated_at;
