-- ============================================================
-- SUPABASE SCHEMA FOR GROCERY TRACKER - FAMILY SHARING
-- 
-- Run this in your Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Families table (each family gets a unique 6-digit code)
CREATE TABLE IF NOT EXISTS families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Family',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT NOT NULL
);

-- Family members
CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, device_id)
);

-- Shared shopping list (synced across family)
CREATE TABLE IF NOT EXISTS shared_shopping_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  unit TEXT NOT NULL DEFAULT 'pieces',
  quantity_needed REAL NOT NULL DEFAULT 0,
  is_purchased BOOLEAN DEFAULT false,
  added_by TEXT,
  purchased_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shared pantry items (synced across family)
CREATE TABLE IF NOT EXISTS shared_pantry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_quantity REAL NOT NULL DEFAULT 0,
  threshold REAL NOT NULL DEFAULT 0,
  expiry_date TEXT,
  last_updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_pantry ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations for anon users (simple device-based auth)
-- In production, you'd use proper auth. For now, open access with family_code as the "key"
CREATE POLICY "Allow all on families" ON families FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on family_members" ON family_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on shared_shopping_list" ON shared_shopping_list FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on shared_pantry" ON shared_pantry FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for shopping list and pantry
ALTER PUBLICATION supabase_realtime ADD TABLE shared_shopping_list;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_pantry;

-- Index for fast family lookups
CREATE INDEX IF NOT EXISTS idx_family_code ON families(family_code);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_shared_shopping_family ON shared_shopping_list(family_id);
CREATE INDEX IF NOT EXISTS idx_shared_pantry_family ON shared_pantry(family_id);
