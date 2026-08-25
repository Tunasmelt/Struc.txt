-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  icon_color TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_preset BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT DEFAULT 'cork',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT,
  note_date TEXT,
  raw_text TEXT,
  audio_path TEXT,
  transcript_source TEXT DEFAULT 'whisper',
  position JSONB DEFAULT '{"x": 0, "y": 0, "rotation": 0, "z_index": 0}'::jsonb,
  search TEXT,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  board_id UUID REFERENCES boards(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note versions table
CREATE TABLE IF NOT EXISTS note_versions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  body JSONB NOT NULL,
  model_used TEXT,
  prompt_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note tags junction table
CREATE TABLE IF NOT EXISTS note_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'suggested',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(note_id, tag_id)
);

-- Action items table
CREATE TABLE IF NOT EXISTS action_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'enrichment',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shares table
CREATE TABLE IF NOT EXISTS shares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies (user can only see their own data)
-- Note: These are placeholder policies - actual user_id relationships need to be added to tables
CREATE POLICY "Users can view their own templates" ON templates
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own templates" ON templates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own templates" ON templates
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own templates" ON templates
  FOR DELETE USING (true);

CREATE POLICY "Users can view their own boards" ON boards
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own boards" ON boards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own boards" ON boards
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own boards" ON boards
  FOR DELETE USING (true);

CREATE POLICY "Users can view their own notes" ON notes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own notes" ON notes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE USING (true);

CREATE POLICY "Users can view their own note versions" ON note_versions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own note versions" ON note_versions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own tags" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own tags" ON tags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own tags" ON tags
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own tags" ON tags
  FOR DELETE USING (true);

CREATE POLICY "Users can view their own note tags" ON note_tags
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own note tags" ON note_tags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own note tags" ON note_tags
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own note tags" ON note_tags
  FOR DELETE USING (true);

CREATE POLICY "Users can view their own action items" ON action_items
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own action items" ON action_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own action items" ON action_items
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own action items" ON action_items
  FOR DELETE USING (true);

CREATE POLICY "Users can view their own shares" ON shares
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own shares" ON shares
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own shares" ON shares
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own shares" ON shares
  FOR DELETE USING (true);

-- Create full-text search index on notes
CREATE INDEX IF NOT EXISTS notes_search_idx ON notes USING gin(to_tsvector('english', search));

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_notes_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search := COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.raw_text, '') || ' ' || COALESCE(NEW.body::text, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector
CREATE TRIGGER update_notes_search
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_search_vector();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();