-- ============================================================
-- NORDSTEIN CRM — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE lead_status AS ENUM (
  'NEU',
  'VK',        -- Verkaufsgespräch
  'CC',        -- Closing Call
  'ABSCHLUSS',
  'FOLLOW_UP',
  'KEIN_INTERESSE',
  'NICHT_ERREICHT'
);

CREATE TYPE user_role AS ENUM ('admin', 'sales', 'viewer');

CREATE TYPE activity_type AS ENUM (
  'status_change',
  'note_added',
  'note_edited',
  'lead_created',
  'lead_deleted',
  'appointment_set',
  'appointment_cancelled',
  'lead_imported',
  'lead_generated',
  'email_sent',
  'call_logged'
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          user_role NOT NULL DEFAULT 'sales',
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'sales')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- LEADS
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Basic info
  name              TEXT NOT NULL,
  industry          TEXT,
  region            TEXT,
  website           TEXT,
  phone             TEXT,
  email_general     TEXT,
  email_ceo         TEXT,
  emails            TEXT,
  ceos              TEXT,
  description       TEXT,
  -- Scoring
  rating            NUMERIC(2,1),
  reviews           INTEGER DEFAULT 0,
  -- Status
  status            lead_status NOT NULL DEFAULT 'NEU',
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Dedup key (name+region normalized)
  dedup_key         TEXT GENERATED ALWAYS AS (
    lower(regexp_replace(name || '|' || COALESCE(region, ''), '\s+', '', 'g'))
  ) STORED,
  -- Assignment
  assigned_to       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Source
  source            TEXT DEFAULT 'manual', -- 'manual', 'import', 'generated', 'meta'
  source_query      TEXT,
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Soft delete
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT leads_name_not_empty CHECK (trim(name) <> '')
);

CREATE UNIQUE INDEX leads_dedup_idx ON leads(dedup_key) WHERE deleted_at IS NULL;
CREATE INDEX leads_status_idx ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX leads_assigned_idx ON leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX leads_created_idx ON leads(created_at DESC);

-- ============================================================
-- NOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX notes_lead_idx ON notes(lead_id) WHERE deleted_at IS NULL;

-- ============================================================
-- APPOINTMENTS / CALENDAR
-- ============================================================

CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  date            DATE NOT NULL,
  time_from       TIME NOT NULL,
  time_to         TIME NOT NULL,
  location        TEXT,
  type            TEXT DEFAULT 'call', -- 'call', 'meeting', 'followup', 'demo'
  status          TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX appointments_date_idx ON appointments(date);
CREATE INDEX appointments_lead_idx ON appointments(lead_id);
CREATE INDEX appointments_assigned_idx ON appointments(assigned_to);

-- ============================================================
-- ACTIVITY LOG (full audit trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type          activity_type NOT NULL,
  -- For status changes
  old_status    lead_status,
  new_status    lead_status,
  -- Generic payload
  metadata      JSONB DEFAULT '{}',
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_lead_idx ON activity_log(lead_id);
CREATE INDEX activity_user_idx ON activity_log(user_id);
CREATE INDEX activity_created_idx ON activity_log(created_at DESC);
CREATE INDEX activity_type_idx ON activity_log(type);

-- ============================================================
-- TAGS (for leads)
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
  id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name  TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#451a3d'
);

CREATE TABLE IF NOT EXISTS lead_tags (
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- ============================================================
-- GENERATOR SESSIONS (track what was already searched)
-- ============================================================

CREATE TABLE IF NOT EXISTS generator_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query         TEXT NOT NULL,
  location      TEXT,
  branches      TEXT[],
  leads_found   INTEGER DEFAULT 0,
  leads_new     INTEGER DEFAULT 0,
  leads_dupes   INTEGER DEFAULT 0,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PIPELINE GOALS (per user, per month)
-- ============================================================

CREATE TABLE IF NOT EXISTS pipeline_goals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month       DATE NOT NULL, -- first day of month
  target_new  INTEGER DEFAULT 50,
  target_vk   INTEGER DEFAULT 20,
  target_cc   INTEGER DEFAULT 10,
  target_close INTEGER DEFAULT 5,
  UNIQUE (user_id, month)
);

-- ============================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: auto-log status changes
-- ============================================================

CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_log (lead_id, user_id, type, old_status, new_status, metadata)
    VALUES (
      NEW.id,
      NEW.status_changed_by,
      'status_change',
      OLD.status,
      NEW.status,
      jsonb_build_object('lead_name', NEW.name)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_status_log
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_lead_status_change();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE generator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_goals ENABLE ROW LEVEL SECURITY;

-- Helper: is current user admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper: is current user at least sales?
CREATE OR REPLACE FUNCTION is_sales_or_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'sales')
  );
$$;

-- PROFILES RLS
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (is_admin());

-- LEADS RLS
CREATE POLICY "leads_select_all_auth" ON leads FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "leads_insert_sales" ON leads FOR INSERT WITH CHECK (is_sales_or_admin());
CREATE POLICY "leads_update_sales" ON leads FOR UPDATE USING (is_sales_or_admin());
CREATE POLICY "leads_delete_admin" ON leads FOR DELETE USING (is_admin());

-- NOTES RLS
CREATE POLICY "notes_select_all_auth" ON notes FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "notes_insert_sales" ON notes FOR INSERT WITH CHECK (is_sales_or_admin());
CREATE POLICY "notes_update_own" ON notes FOR UPDATE USING (created_by = auth.uid() OR is_admin());
CREATE POLICY "notes_delete_own_or_admin" ON notes FOR DELETE USING (created_by = auth.uid() OR is_admin());

-- APPOINTMENTS RLS
CREATE POLICY "appointments_select_auth" ON appointments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "appointments_insert_sales" ON appointments FOR INSERT WITH CHECK (is_sales_or_admin());
CREATE POLICY "appointments_update_own_or_admin" ON appointments FOR UPDATE USING (created_by = auth.uid() OR is_admin());
CREATE POLICY "appointments_delete_own_or_admin" ON appointments FOR DELETE USING (created_by = auth.uid() OR is_admin());

-- ACTIVITY LOG RLS (read-only for all authenticated)
CREATE POLICY "activity_select_auth" ON activity_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "activity_insert_system" ON activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- TAGS RLS
CREATE POLICY "tags_select_auth" ON tags FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tags_manage_admin" ON tags FOR ALL USING (is_admin());
CREATE POLICY "tags_insert_sales" ON tags FOR INSERT WITH CHECK (is_sales_or_admin());

-- LEAD_TAGS RLS
CREATE POLICY "lead_tags_select_auth" ON lead_tags FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lead_tags_manage_sales" ON lead_tags FOR ALL USING (is_sales_or_admin());

-- GENERATOR_SESSIONS RLS
CREATE POLICY "gen_sessions_select_auth" ON generator_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "gen_sessions_insert_sales" ON generator_sessions FOR INSERT WITH CHECK (is_sales_or_admin());

-- PIPELINE_GOALS RLS
CREATE POLICY "goals_select_auth" ON pipeline_goals FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "goals_manage_own_or_admin" ON pipeline_goals FOR ALL USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- VIEWS
-- ============================================================

-- Pipeline summary view
CREATE OR REPLACE VIEW pipeline_summary AS
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_this_week,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month
FROM leads
WHERE deleted_at IS NULL
GROUP BY status;

-- User activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  COUNT(DISTINCT l.id) as total_leads_owned,
  COUNT(DISTINCT al.id) FILTER (WHERE al.created_at >= NOW() - INTERVAL '30 days') as actions_last_30d,
  MAX(al.created_at) as last_activity
FROM profiles p
LEFT JOIN leads l ON l.assigned_to = p.id AND l.deleted_at IS NULL
LEFT JOIN activity_log al ON al.user_id = p.id
GROUP BY p.id, p.full_name, p.email, p.role;

-- ============================================================
-- SEED: Default tags
-- ============================================================

INSERT INTO tags (name, color) VALUES
  ('Hot Lead', '#dc2626'),
  ('Warm', '#f97316'),
  ('Cold', '#3b82f6'),
  ('VIP', '#451a3d'),
  ('Callback', '#8b5cf6'),
  ('Newsletter', '#6b7280')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- FUNCTION: Get leads with dedup check for generator
-- Returns new leads count after filtering existing ones
-- ============================================================

CREATE OR REPLACE FUNCTION check_dedup_keys(keys TEXT[])
RETURNS TEXT[] LANGUAGE sql SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT unnest(keys) AS k
    EXCEPT
    SELECT dedup_key FROM leads WHERE deleted_at IS NULL
  );
$$;
