-- ============================================================================
-- PantryPal Supabase Schema
-- Run this ENTIRE script in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── HOUSEHOLDS ───────────────────────────────────────────────────────────────
-- A household is a shared pantry group. One user creates it, others join via
-- invite code. All members see the same synced pantry items.

CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick invite code lookups during join flow
CREATE INDEX IF NOT EXISTS idx_households_invite_code ON households(invite_code);

-- ─── HOUSEHOLD MEMBERS ────────────────────────────────────────────────────────
-- Many-to-many relationship between users and households.
-- A user can only be in ONE household at a time (enforced by unique on user_id).

CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  display_name TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);

-- ─── SYNCED ITEMS (Cloud Pantry) ──────────────────────────────────────────────
-- Mirrors the local SQLite `items` table structure but scoped to a household.
-- All household members read/write to the same set of synced_items.

CREATE TABLE IF NOT EXISTS synced_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_quantity REAL NOT NULL DEFAULT 0,
  threshold REAL NOT NULL DEFAULT 0,
  consumption_mode TEXT NOT NULL DEFAULT 'manual',
  auto_consumption_rate REAL,
  auto_consumption_frequency TEXT,
  price REAL,
  expiry_date TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_synced_items_household ON synced_items(household_id);

-- ─── SYNCED CONSUMPTION LOGS ──────────────────────────────────────────────────
-- Mirrors local consumption_logs, scoped to a household item.

CREATE TABLE IF NOT EXISTS synced_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES synced_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quantity REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'auto', 'restock')),
  note TEXT,
  price REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_synced_logs_item ON synced_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_synced_logs_household ON synced_logs(household_id);

-- ─── SYNCED SHOPPING LIST ─────────────────────────────────────────────────────
-- Shared shopping list for the household.

CREATE TABLE IF NOT EXISTS synced_shopping_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity_needed REAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  item_id UUID REFERENCES synced_items(id) ON DELETE SET NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_synced_shopping_household ON synced_shopping_list(household_id);

-- ─── ROW LEVEL SECURITY (RLS) ─────────────────────────────────────────────────
-- Ensures users can only access data for households they belong to.

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_shopping_list ENABLE ROW LEVEL SECURITY;

-- Households: members can read their own household
CREATE POLICY "Users can view their household"
  ON households FOR SELECT
  USING (id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Households: any authenticated user can create a household
CREATE POLICY "Authenticated users can create households"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Households: only the creator can update/delete
CREATE POLICY "Owner can update household"
  ON households FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Owner can delete household"
  ON households FOR DELETE
  USING (created_by = auth.uid());

-- Household members: members can see other members in their household
CREATE POLICY "Members can view household members"
  ON household_members FOR SELECT
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Household members: any authenticated user can join (insert themselves)
CREATE POLICY "Users can join households"
  ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Household members: users can remove themselves (leave)
CREATE POLICY "Users can leave households"
  ON household_members FOR DELETE
  USING (user_id = auth.uid());

-- Synced items: household members can CRUD
CREATE POLICY "Members can view synced items"
  ON synced_items FOR SELECT
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert synced items"
  ON synced_items FOR INSERT
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update synced items"
  ON synced_items FOR UPDATE
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete synced items"
  ON synced_items FOR DELETE
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Synced logs: household members can CRUD
CREATE POLICY "Members can view synced logs"
  ON synced_logs FOR SELECT
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert synced logs"
  ON synced_logs FOR INSERT
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Synced shopping list: household members can CRUD
CREATE POLICY "Members can view synced shopping list"
  ON synced_shopping_list FOR SELECT
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert synced shopping items"
  ON synced_shopping_list FOR INSERT
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update synced shopping items"
  ON synced_shopping_list FOR UPDATE
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete synced shopping items"
  ON synced_shopping_list FOR DELETE
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- ─── ENABLE REALTIME ──────────────────────────────────────────────────────────
-- Allow real-time subscriptions on synced tables so household members see
-- live updates when another member adds/modifies items.

ALTER PUBLICATION supabase_realtime ADD TABLE synced_items;
ALTER PUBLICATION supabase_realtime ADD TABLE synced_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE synced_shopping_list;

-- ─── HELPER: Auto-generate invite codes ──────────────────────────────────────
-- Generates a random 6-character uppercase alphanumeric code for easy sharing.

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM households WHERE invite_code = code) INTO exists_already;
    IF NOT exists_already THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
