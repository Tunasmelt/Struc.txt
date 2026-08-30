-- Phase 6 (Audio capture): a private storage bucket for recorded audio,
-- scoped per-user by the object path's top-level folder (uploads go to
-- `${user.id}/${filename}`), matching the exit gate's requirement that
-- audio is only ever accessible via a signed URL, never a public path.

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-captures', 'audio-captures', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own audio captures" ON storage.objects;
CREATE POLICY "Users can upload their own audio captures" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'audio-captures' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read their own audio captures" ON storage.objects;
CREATE POLICY "Users can read their own audio captures" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'audio-captures' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own audio captures" ON storage.objects;
CREATE POLICY "Users can delete their own audio captures" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'audio-captures' AND (storage.foldername(name))[1] = auth.uid()::text);
