-- Add template_id column to note_versions
ALTER TABLE note_versions 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id) ON DELETE SET NULL;
