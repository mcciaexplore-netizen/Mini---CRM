-- Fresh Neon/PostgreSQL database. Run with npm run db:migrate.
-- Auth and integration secrets use the server database role. CRM queries use a
-- non-login role with RLS and a transaction-local verified user identity.
DO $role$ BEGIN
  IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='promarketer_app') THEN CREATE ROLE promarketer_app NOLOGIN; END IF;
END $role$;
GRANT promarketer_app TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO promarketer_app;
CREATE FUNCTION public.current_app_user_id() RETURNS uuid LANGUAGE sql STABLE AS $identity$
  SELECT nullif(current_setting('app.user_id',true),'')::uuid
$identity$;
CREATE TABLE public."user" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);
CREATE TABLE public."session" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "expiresAt" timestamptz NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX ON public."session" ("userId");
CREATE TABLE public."account" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);
CREATE INDEX ON public."account" ("userId");
CREATE TABLE public."verification" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);
CREATE INDEX ON public."verification" ("identifier");
CREATE TABLE public."rateLimit" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL,
  "lastRequest" bigint NOT NULL
);
-- ============================================
-- PROFILES (extends Better Auth user)
-- One profile per team member
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES public."user"(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member', -- owner | admin | member | viewer
  department TEXT,            -- Sales | Marketing | Management
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile when new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.name, split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON public."user"
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);




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
  created_at TIMESTAMPTZ DEFAULT NOW()
);




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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate lead_code (LP-001, LP-002...)


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
  logged_at TIMESTAMPTZ DEFAULT NOW(),
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
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'Draft',   -- Draft | Scheduled | Published
  google_event_id TEXT,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);


ALTER TABLE business_profile ADD COLUMN google_calendar_auto_sync boolean DEFAULT true, ADD COLUMN campaign_storage_provider text DEFAULT 'neon';
CREATE TABLE google_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE, access_token text, refresh_token text, expiry_date bigint, email text, created_at timestamptz DEFAULT now());
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
  PRIMARY KEY (organization_id, user_id),
  UNIQUE (user_id)
);
COMMENT ON TABLE public.organization_members IS 'One business per user for this release. Only trusted server/admin operations can change membership.';
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.current_app_organization_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.organization_id FROM organization_members m JOIN profiles p ON p.id = m.user_id
  WHERE m.user_id = public.current_app_user_id() AND p.is_active = true
$$;
CREATE FUNCTION public.current_app_business_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM organization_members m JOIN profiles p ON p.id = m.user_id
  WHERE m.user_id = public.current_app_user_id() AND p.is_active = true
$$;
REVOKE ALL ON FUNCTION public.current_app_organization_id(), public.current_app_business_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_organization_id(), public.current_app_business_role() TO promarketer_app;

DO $migration$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['business_profile','spaces','leads','activities','campaigns','scheduled_posts','goals','notifications','google_tokens'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN organization_id uuid NOT NULL DEFAULT public.current_app_organization_id() REFERENCES public.organizations(id)',t);
    EXECUTE format('CREATE INDEX ON public.%I (organization_id)',t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  END LOOP;
END $migration$;

ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS active_ai_provider text DEFAULT 'gemini';
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS grok_api_key text;
ALTER TABLE business_profile ADD CONSTRAINT business_profile_organization_unique UNIQUE(organization_id);
ALTER TABLE business_profile ADD CONSTRAINT business_profile_provider_check CHECK(active_ai_provider IN ('gemini','openai','grok'));
ALTER TABLE business_profile ADD CONSTRAINT business_profile_storage_check CHECK(campaign_storage_provider IN ('neon','sheets','both'));
CREATE TABLE public.organization_secrets (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  gemini_api_key text, openai_api_key text, grok_api_key text
);
ALTER TABLE public.organization_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_secrets FROM PUBLIC, promarketer_app;

INSERT INTO organization_secrets SELECT organization_id, gemini_api_key, openai_api_key, grok_api_key FROM business_profile;
ALTER TABLE business_profile DROP COLUMN gemini_api_key, DROP COLUMN openai_api_key, DROP COLUMN grok_api_key;

-- Composite references ensure related rows belong to the same business.
ALTER TABLE spaces ADD CONSTRAINT spaces_org_id_unique UNIQUE(organization_id, id);
ALTER TABLE leads ADD CONSTRAINT leads_org_id_unique UNIQUE(organization_id, id);
ALTER TABLE campaigns ADD CONSTRAINT campaigns_org_id_unique UNIQUE(organization_id, id);
ALTER TABLE leads ADD CONSTRAINT leads_space_tenant_fk FOREIGN KEY(organization_id, space_id) REFERENCES spaces(organization_id, id) ON DELETE CASCADE;
ALTER TABLE activities ADD CONSTRAINT activities_lead_tenant_fk FOREIGN KEY(organization_id, lead_id) REFERENCES leads(organization_id, id) ON DELETE CASCADE;
ALTER TABLE goals ADD CONSTRAINT goals_space_tenant_fk FOREIGN KEY(organization_id, space_id) REFERENCES spaces(organization_id, id) ON DELETE CASCADE;
ALTER TABLE scheduled_posts ADD CONSTRAINT posts_campaign_tenant_fk FOREIGN KEY(organization_id, campaign_id) REFERENCES campaigns(organization_id, id);
ALTER TABLE leads ADD CONSTRAINT leads_assignee_tenant_fk FOREIGN KEY(organization_id, assignee_id) REFERENCES organization_members(organization_id, user_id);
ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_tenant_fk FOREIGN KEY(organization_id, recipient_id) REFERENCES organization_members(organization_id, user_id);
ALTER TABLE google_tokens ADD CONSTRAINT google_tokens_user_tenant_fk FOREIGN KEY(organization_id, user_id) REFERENCES organization_members(organization_id, user_id);
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK(status IN ('NEW','CONTACTED','INTERESTED','NEGOTIATING','WON','LOST'));
ALTER TABLE leads ADD CONSTRAINT leads_value_check CHECK(deal_value >= 0);
ALTER TABLE leads ADD CONSTRAINT leads_name_check CHECK(length(trim(name)) BETWEEN 1 AND 200);
CREATE INDEX leads_followup_idx ON leads(organization_id, next_followup);
CREATE INDEX activities_lead_idx ON activities(organization_id, lead_id, logged_at DESC);

-- A sequence remains safe after deletion and concurrent inserts.
CREATE SEQUENCE public.lead_code_seq;
SELECT setval('public.lead_code_seq', greatest(coalesce((SELECT max(substring(lead_code FROM '^LP-([0-9]+)$')::bigint) FROM leads),0)+1,1), false);
CREATE OR REPLACE FUNCTION public.generate_lead_code() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.lead_code := 'LP-' || to_char(nextval('public.lead_code_seq'), 'FM000000000');
  RETURN NEW;
END $$;

-- Browser clients need CRUD only. RLS does not protect TRUNCATE.
REVOKE ALL ON organizations, organization_members FROM PUBLIC, promarketer_app;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['business_profile','spaces','leads','activities','campaigns','scheduled_posts','goals','notifications','google_tokens'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, promarketer_app', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO promarketer_app', t);
  END LOOP;
END $$;
-- Replace ALL old permissive policies, not just the named examples.
DO $$
DECLARE p record; t text;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename = ANY(ARRAY['profiles','business_profile','spaces','leads','activities','campaigns','scheduled_posts','goals','notifications','google_tokens'])
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename); END LOOP;
  FOREACH t IN ARRAY ARRAY['spaces','leads','activities','campaigns','scheduled_posts','goals']
  LOOP
    EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO promarketer_app USING (organization_id = public.current_app_organization_id())', t);
    EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT TO promarketer_app WITH CHECK (organization_id = public.current_app_organization_id() AND public.current_app_business_role() IN (%L,%L,%L))', t,'owner','manager',CASE WHEN t='spaces' THEN 'manager' ELSE 'member' END);
    EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE TO promarketer_app USING (organization_id = public.current_app_organization_id() AND public.current_app_business_role() IN (%L,%L,%L)) WITH CHECK (organization_id = public.current_app_organization_id() AND public.current_app_business_role() IN (%L,%L,%L))',t,'owner','manager',CASE WHEN t='spaces' THEN 'manager' ELSE 'member' END,'owner','manager',CASE WHEN t='spaces' THEN 'manager' ELSE 'member' END);
    EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE TO promarketer_app USING (organization_id = public.current_app_organization_id() AND public.current_app_business_role() IN (%L,%L))',t,'owner','manager');
  END LOOP;
END $$;

CREATE POLICY organization_read ON organizations FOR SELECT TO promarketer_app USING(id = current_app_organization_id());
CREATE POLICY membership_read ON organization_members FOR SELECT TO promarketer_app USING(organization_id = current_app_organization_id());
-- No client can invite itself, promote itself, or change its organization.
REVOKE INSERT, UPDATE, DELETE ON organization_members, organizations FROM PUBLIC, promarketer_app;
GRANT SELECT ON organization_members, organizations TO promarketer_app;
CREATE POLICY profile_read ON profiles FOR SELECT TO promarketer_app USING(id = public.current_app_user_id() OR EXISTS(SELECT 1 FROM organization_members m WHERE m.user_id = profiles.id AND m.organization_id = current_app_organization_id()));
CREATE POLICY profile_update ON profiles FOR UPDATE TO promarketer_app USING(id = public.current_app_user_id()) WITH CHECK(id = public.current_app_user_id());
REVOKE ALL ON profiles FROM PUBLIC, promarketer_app;
GRANT SELECT ON profiles TO promarketer_app;
GRANT UPDATE(full_name, avatar_url, department) ON profiles TO promarketer_app;
CREATE POLICY business_read ON business_profile FOR SELECT TO promarketer_app USING(organization_id = current_app_organization_id());
CREATE POLICY business_update ON business_profile FOR UPDATE TO promarketer_app USING(organization_id = current_app_organization_id() AND current_app_business_role() IN ('owner','manager')) WITH CHECK(organization_id = current_app_organization_id() AND current_app_business_role() IN ('owner','manager'));
CREATE POLICY notification_read ON notifications FOR SELECT TO promarketer_app USING(organization_id = current_app_organization_id() AND recipient_id = public.current_app_user_id());
CREATE POLICY notification_update ON notifications FOR UPDATE TO promarketer_app USING(organization_id = current_app_organization_id() AND recipient_id = public.current_app_user_id()) WITH CHECK(organization_id = current_app_organization_id() AND recipient_id = public.current_app_user_id());
CREATE POLICY tokens_own ON google_tokens FOR ALL TO promarketer_app USING(organization_id = current_app_organization_id() AND user_id = public.current_app_user_id()) WITH CHECK(organization_id = current_app_organization_id() AND user_id = public.current_app_user_id());

-- Event IDs select which external Google resource a private token may mutate.
-- Only authorized server integration routes may write these bindings.
REVOKE INSERT, UPDATE ON scheduled_posts FROM promarketer_app;
GRANT INSERT(organization_id, platforms, caption, image_url, scheduled_at, status, campaign_id, created_by) ON scheduled_posts TO promarketer_app;
GRANT UPDATE(platforms, caption, image_url, scheduled_at, status, campaign_id) ON scheduled_posts TO promarketer_app;

-- Stamp authors and stop clients changing the business/author through an update.
CREATE FUNCTION public.stamp_business_record() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'Business cannot be changed'; END IF;
  IF TG_OP='INSERT' AND public.current_app_user_id() IS NOT NULL THEN NEW.created_by := public.current_app_user_id(); END IF;
  IF TG_OP='UPDATE' THEN NEW.created_by := OLD.created_by; END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['spaces','leads','campaigns','scheduled_posts','goals'] LOOP
    EXECUTE format('CREATE TRIGGER stamp_business_record BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.stamp_business_record()',t);
  END LOOP;
END $$;
CREATE FUNCTION public.stamp_activity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' AND public.current_app_user_id() IS NOT NULL THEN NEW.logged_by := public.current_app_user_id(); END IF;
  IF TG_OP='UPDATE' THEN
    NEW.logged_by := OLD.logged_by;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'Business cannot be changed'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER stamp_activity BEFORE INSERT OR UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION stamp_activity();

CREATE FUNCTION public.create_business(business_name text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org_id uuid;
BEGIN
  IF public.current_app_user_id() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(public.current_app_user_id()::text, 0));
  IF EXISTS(SELECT 1 FROM organization_members WHERE user_id = public.current_app_user_id()) THEN RAISE EXCEPTION 'You already belong to a business'; END IF;
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = public.current_app_user_id() AND is_active = true) THEN RAISE EXCEPTION 'Account is not active'; END IF;
  IF business_name IS NULL OR length(trim(business_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Enter a business name of up to 120 characters'; END IF;
  INSERT INTO organizations(name) VALUES(trim(business_name)) RETURNING id INTO org_id;
  INSERT INTO organization_members VALUES(org_id, public.current_app_user_id(), 'owner');
  INSERT INTO business_profile(organization_id, business_name) VALUES(org_id, trim(business_name));
  INSERT INTO spaces(organization_id,name,description,created_by) VALUES(org_id,'Lead Pipeline','Main sales pipeline',public.current_app_user_id());
  RETURN org_id;
END $$;
REVOKE ALL ON FUNCTION public.create_business(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_business(text) TO promarketer_app;
-- Keep a genuine activity history for lead creation and stage changes.
CREATE FUNCTION public.record_lead_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities(organization_id,lead_id,type,description,logged_by) VALUES(NEW.organization_id,NEW.id,'Note','Lead created',public.current_app_user_id());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO activities(organization_id,lead_id,type,description,logged_by) VALUES(NEW.organization_id,NEW.id,'Note','Stage changed from ' || OLD.status || ' to ' || NEW.status,public.current_app_user_id());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER record_lead_activity AFTER INSERT OR UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION record_lead_activity();
CREATE TRIGGER set_lead_code BEFORE INSERT ON leads FOR EACH ROW EXECUTE FUNCTION generate_lead_code();

-- File uploads are limited to small business logos; no external bucket required.
CREATE TABLE business_logos (
 organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
 mime_type text NOT NULL CHECK(mime_type IN ('image/png','image/jpeg','image/webp')),
 content bytea NOT NULL CHECK(octet_length(content)<=524288),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE business_logos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON business_logos, "user", "session", "account", "verification", "rateLimit" FROM PUBLIC,promarketer_app;
