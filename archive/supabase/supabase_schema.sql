-- ============================================
-- PROFILES (extends Supabase auth.users)
-- One profile per team member
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member', -- owner | admin | member | viewer
  department TEXT,            -- Sales | Marketing | Management
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auto-create profile when new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- BUSINESS PROFILE (single row, company-wide settings)
-- ============================================
CREATE TABLE business_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT,
  industry TEXT,
  website TEXT,
  city TEXT,
  state TEXT,
  gst_number TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0176D3',
  gemini_api_key TEXT,
  openai_api_key TEXT,
  whatsapp_number TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert one default row on setup
INSERT INTO business_profile (business_name) VALUES ('My Company');

-- ============================================
-- SPACES (Jira-style boards for Lead management)
-- ============================================
CREATE TABLE spaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#0176D3',
  emoji TEXT DEFAULT '📋',
  template TEXT DEFAULT 'sales', -- sales | partnership | events | custom
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Default space created on first run
INSERT INTO spaces (name, description, emoji)
VALUES ('Lead Pipeline', 'Main sales pipeline', '🚀');

-- ============================================
-- LEADS
-- ============================================
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  lead_code TEXT UNIQUE,         -- e.g. LP-001, auto-generated
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  source TEXT,                   -- WhatsApp|Instagram|Referral|Website|Cold Call|LinkedIn
  status TEXT DEFAULT 'NEW',     -- NEW|CONTACTED|INTERESTED|NEGOTIATING|WON|LOST
  deal_value NUMERIC DEFAULT 0,
  next_followup DATE,
  last_contact DATE,
  assignee_id UUID REFERENCES profiles(id),
  position INTEGER DEFAULT 0,    -- ordering within kanban column
  tags TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Auto-generate lead_code (LP-001, LP-002...)
CREATE OR REPLACE FUNCTION generate_lead_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM leads;
  NEW.lead_code := 'LP-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_lead_code
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION generate_lead_code();

-- Auto-update updated_at on any change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ACTIVITIES (timeline per lead)
-- ============================================
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,     -- Call | Meeting | Email | Note | WhatsApp
  description TEXT,
  logged_at TIMESTAMP DEFAULT NOW(),
  logged_by UUID REFERENCES profiles(id)
);

-- ============================================
-- CAMPAIGNS
-- ============================================
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  business_type TEXT,
  product TEXT,
  target_customer TEXT,
  budget_range TEXT,
  goal TEXT,
  duration TEXT,
  language TEXT,
  platforms TEXT[],
  tone TEXT,
  industry TEXT,
  key_dates TEXT,
  calendar_data JSONB,
  status TEXT DEFAULT 'draft',   -- draft | active | completed
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- SCHEDULED POSTS
-- ============================================
CREATE TABLE scheduled_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  platforms TEXT[],
  caption TEXT,
  image_url TEXT,
  scheduled_at TIMESTAMP,
  status TEXT DEFAULT 'Draft',   -- Draft | Scheduled | Published
  google_event_id TEXT,
  published_at TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- GOALS
-- ============================================
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metric_type TEXT,              -- leads | revenue | conversion_rate | custom
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  deadline DATE,
  status TEXT DEFAULT 'active',  -- active | achieved | failed
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS (real-time alerts for team)
-- ============================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT,    -- follow_up_due | lead_assigned | lead_won | campaign_due
  title TEXT,
  message TEXT,
  link TEXT,    -- e.g. /leads?lead=LP-001
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- All logged-in users can read/write everything (single company app)
-- Only block unauthenticated access
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;

-- Policy: any authenticated user can do everything
CREATE POLICY "Authenticated users have full access" ON profiles
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON leads
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON spaces
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON activities
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON campaigns
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON scheduled_posts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON goals
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON business_profile
  FOR ALL USING (auth.role() = 'authenticated');

-- Notifications: users only see their own
CREATE POLICY "Users see own notifications" ON notifications
  FOR ALL USING (auth.uid() = recipient_id);

-- Role-based restriction: only owner/admin can delete leads
CREATE POLICY "Only admin can delete leads" ON leads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- ============================================
-- GOOGLE CALENDAR INTEGRATION UPGRADES
-- ============================================
ALTER TABLE business_profile
  ADD COLUMN IF NOT EXISTS google_calendar_auto_sync BOOLEAN DEFAULT true;

ALTER TABLE business_profile
  ADD COLUMN IF NOT EXISTS campaign_storage_provider TEXT DEFAULT 'supabase';

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

CREATE TABLE IF NOT EXISTS google_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  expiry_date BIGINT,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users have full access" ON google_tokens
  FOR ALL USING (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE spaces;
