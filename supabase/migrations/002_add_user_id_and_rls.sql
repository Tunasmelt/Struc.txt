-- Drop placeholder policies
DROP POLICY IF EXISTS "Users can view their own templates" ON templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON templates;

DROP POLICY IF EXISTS "Users can view their own boards" ON boards;
DROP POLICY IF EXISTS "Users can insert their own boards" ON boards;
DROP POLICY IF EXISTS "Users can update their own boards" ON boards;
DROP POLICY IF EXISTS "Users can delete their own boards" ON boards;

DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

DROP POLICY IF EXISTS "Users can view their own note versions" ON note_versions;
DROP POLICY IF EXISTS "Users can insert their own note versions" ON note_versions;

DROP POLICY IF EXISTS "Users can view their own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert their own tags" ON tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON tags;

DROP POLICY IF EXISTS "Users can view their own note tags" ON note_tags;
DROP POLICY IF EXISTS "Users can insert their own note tags" ON note_tags;
DROP POLICY IF EXISTS "Users can update their own note tags" ON note_tags;
DROP POLICY IF EXISTS "Users can delete their own note tags" ON note_tags;

DROP POLICY IF EXISTS "Users can view their own action items" ON action_items;
DROP POLICY IF EXISTS "Users can insert their own action items" ON action_items;
DROP POLICY IF EXISTS "Users can update their own action items" ON action_items;
DROP POLICY IF EXISTS "Users can delete their own action items" ON action_items;

-- Add user_id column to tables
ALTER TABLE templates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create RLS Policies

-- Templates
CREATE POLICY "Users can view their own or preset templates" ON templates
  FOR SELECT USING (user_id = auth.uid() OR is_preset = true);

CREATE POLICY "Users can insert their own templates" ON templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates" ON templates
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates" ON templates
  FOR DELETE USING (user_id = auth.uid());

-- Boards
CREATE POLICY "Users can view their own boards" ON boards
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own boards" ON boards
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own boards" ON boards
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own boards" ON boards
  FOR DELETE USING (user_id = auth.uid());

-- Notes
CREATE POLICY "Users can view their own notes" ON notes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notes" ON notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE USING (user_id = auth.uid());

-- Note versions
CREATE POLICY "Users can view their own note versions" ON note_versions
  FOR SELECT USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_versions.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can insert their own note versions" ON note_versions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_versions.note_id AND notes.user_id = auth.uid()));

-- Tags (global table, anyone can query or insert)
CREATE POLICY "Anyone can view tags" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert tags" ON tags
  FOR INSERT WITH CHECK (true);

-- Note tags
CREATE POLICY "Users can view their own note tags" ON note_tags
  FOR SELECT USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_tags.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can insert their own note tags" ON note_tags
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_tags.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can update their own note tags" ON note_tags
  FOR UPDATE USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_tags.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can delete their own note tags" ON note_tags
  FOR DELETE USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_tags.note_id AND notes.user_id = auth.uid()));

-- Action items
CREATE POLICY "Users can view their own action items" ON action_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = action_items.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can insert their own action items" ON action_items
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM notes WHERE notes.id = action_items.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can update their own action items" ON action_items
  FOR UPDATE USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = action_items.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can delete their own action items" ON action_items
  FOR DELETE USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = action_items.note_id AND notes.user_id = auth.uid()));
