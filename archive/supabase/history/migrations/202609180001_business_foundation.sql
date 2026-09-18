-- Apply after supabase_schema.sql, once, in a transaction.
-- For an existing company set app.legacy_owner_id and app.legacy_member_ids
-- as described in README.md BEFORE running this migration.
BEGIN;
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
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.current_organization_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.organization_id FROM organization_members m JOIN profiles p ON p.id = m.user_id
  WHERE m.user_id = auth.uid() AND p.is_active = true
$$;
CREATE FUNCTION public.current_business_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM organization_members m JOIN profiles p ON p.id = m.user_id
  WHERE m.user_id = auth.uid() AND p.is_active = true
$$;
REVOKE ALL ON FUNCTION public.current_organization_id(), public.current_business_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_organization_id(), public.current_business_role() TO authenticated;

-- Keep one existing company, with explicitly selected trusted members.
DO $$
DECLARE legacy_id uuid; owner_id uuid; member_ids uuid[]; table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM profiles) THEN
    owner_id := nullif(current_setting('app.legacy_owner_id', true), '')::uuid;
    IF owner_id IS NULL OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = owner_id) THEN
      RAISE EXCEPTION 'Set app.legacy_owner_id to a verified existing profile ID before migration.';
    END IF;
    member_ids := coalesce(string_to_array(nullif(current_setting('app.legacy_member_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]) || owner_id;
    IF EXISTS (SELECT 1 FROM unnest(member_ids) AS x(id) WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = x.id)) THEN
      RAISE EXCEPTION 'Every legacy member must have a profile.';
    END IF;
  END IF;
  IF (SELECT count(*) FROM business_profile) > 1 THEN
    RAISE EXCEPTION 'Consolidate duplicate business_profile rows before migration; no rows will be discarded automatically.';
  END IF;
  INSERT INTO organizations(name) VALUES (coalesce((SELECT nullif(business_name, '') FROM business_profile LIMIT 1), 'Existing business')) RETURNING id INTO legacy_id;
  IF owner_id IS NOT NULL THEN
    INSERT INTO organization_members(organization_id, user_id, role)
      SELECT legacy_id, id, CASE WHEN id = owner_id THEN 'owner' ELSE 'member' END FROM profiles WHERE id = ANY(member_ids);
  END IF;
  FOREACH table_name IN ARRAY ARRAY['business_profile','spaces','leads','activities','campaigns','scheduled_posts','goals','notifications','google_tokens']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN organization_id uuid REFERENCES public.organizations(id)', table_name);
    EXECUTE format('UPDATE public.%I SET organization_id = $1', table_name) USING legacy_id;
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN organization_id SET DEFAULT public.current_organization_id()', table_name);
    EXECUTE format('CREATE INDEX ON public.%I (organization_id)', table_name);
  END LOOP;
END $$;

ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS active_ai_provider text DEFAULT 'gemini';
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS grok_api_key text;
ALTER TABLE business_profile ADD CONSTRAINT business_profile_organization_unique UNIQUE(organization_id);
ALTER TABLE business_profile ADD CONSTRAINT business_profile_provider_check CHECK(active_ai_provider IN ('gemini','openai','grok'));
ALTER TABLE business_profile ADD CONSTRAINT business_profile_storage_check CHECK(campaign_storage_provider IN ('supabase','sheets','both'));
CREATE TABLE public.organization_secrets (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  gemini_api_key text, openai_api_key text, grok_api_key text
);
ALTER TABLE public.organization_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_secrets FROM anon, authenticated;
GRANT ALL ON public.organization_secrets TO service_role;
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
REVOKE ALL ON organizations, organization_members FROM anon, authenticated;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['business_profile','spaces','leads','activities','campaigns','scheduled_posts','goals','notifications','google_tokens'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
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
    EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING (organization_id = public.current_organization_id())', t);
    EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_organization_id() AND public.current_business_role() IN (%L,%L,%L))', t,'owner','manager',CASE WHEN t='spaces' THEN 'manager' ELSE 'member' END);
    EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING (organization_id = public.current_organization_id() AND public.current_business_role() IN (%L,%L,%L)) WITH CHECK (organization_id = public.current_organization_id() AND public.current_business_role() IN (%L,%L,%L))',t,'owner','manager',CASE WHEN t='spaces' THEN 'manager' ELSE 'member' END,'owner','manager',CASE WHEN t='spaces' THEN 'manager' ELSE 'member' END);
    EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE TO authenticated USING (organization_id = public.current_organization_id() AND public.current_business_role() IN (%L,%L))',t,'owner','manager');
  END LOOP;
END $$;

CREATE POLICY organization_read ON organizations FOR SELECT TO authenticated USING(id = current_organization_id());
CREATE POLICY membership_read ON organization_members FOR SELECT TO authenticated USING(organization_id = current_organization_id());
-- No client can invite itself, promote itself, or change its organization.
REVOKE INSERT, UPDATE, DELETE ON organization_members, organizations FROM anon, authenticated;
GRANT SELECT ON organization_members, organizations TO authenticated;
CREATE POLICY profile_read ON profiles FOR SELECT TO authenticated USING(id = auth.uid() OR EXISTS(SELECT 1 FROM organization_members m WHERE m.user_id = profiles.id AND m.organization_id = current_organization_id()));
CREATE POLICY profile_update ON profiles FOR UPDATE TO authenticated USING(id = auth.uid()) WITH CHECK(id = auth.uid());
REVOKE ALL ON profiles FROM anon, authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE(full_name, avatar_url, department) ON profiles TO authenticated;
CREATE POLICY business_read ON business_profile FOR SELECT TO authenticated USING(organization_id = current_organization_id());
CREATE POLICY business_update ON business_profile FOR UPDATE TO authenticated USING(organization_id = current_organization_id() AND current_business_role() IN ('owner','manager')) WITH CHECK(organization_id = current_organization_id() AND current_business_role() IN ('owner','manager'));
CREATE POLICY notification_read ON notifications FOR SELECT TO authenticated USING(organization_id = current_organization_id() AND recipient_id = auth.uid());
CREATE POLICY notification_update ON notifications FOR UPDATE TO authenticated USING(organization_id = current_organization_id() AND recipient_id = auth.uid()) WITH CHECK(organization_id = current_organization_id() AND recipient_id = auth.uid());
CREATE POLICY tokens_own ON google_tokens FOR ALL TO authenticated USING(organization_id = current_organization_id() AND user_id = auth.uid()) WITH CHECK(organization_id = current_organization_id() AND user_id = auth.uid());

-- Event IDs select which external Google resource a private token may mutate.
-- Only authorized server integration routes may write these bindings.
REVOKE INSERT, UPDATE ON scheduled_posts FROM authenticated;
GRANT INSERT(platforms, caption, image_url, scheduled_at, status, campaign_id, created_by) ON scheduled_posts TO authenticated;
GRANT UPDATE(platforms, caption, image_url, scheduled_at, status, campaign_id) ON scheduled_posts TO authenticated;

-- Stamp authors and stop clients changing the business/author through an update.
CREATE FUNCTION public.stamp_business_record() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'Business cannot be changed'; END IF;
  IF TG_OP='INSERT' AND auth.uid() IS NOT NULL THEN NEW.created_by := auth.uid(); END IF;
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
  IF TG_OP='INSERT' AND auth.uid() IS NOT NULL THEN NEW.logged_by := auth.uid(); END IF;
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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  IF EXISTS(SELECT 1 FROM organization_members WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'You already belong to a business'; END IF;
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true) THEN RAISE EXCEPTION 'Account is not active'; END IF;
  IF business_name IS NULL OR length(trim(business_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Enter a business name of up to 120 characters'; END IF;
  INSERT INTO organizations(name) VALUES(trim(business_name)) RETURNING id INTO org_id;
  INSERT INTO organization_members VALUES(org_id, auth.uid(), 'owner');
  INSERT INTO business_profile(organization_id, business_name) VALUES(org_id, trim(business_name));
  INSERT INTO spaces(organization_id,name,description,created_by) VALUES(org_id,'Lead Pipeline','Main sales pipeline',auth.uid());
  RETURN org_id;
END $$;
REVOKE ALL ON FUNCTION public.create_business(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_business(text) TO authenticated;
-- Keep a genuine activity history for lead creation and stage changes.
CREATE FUNCTION public.record_lead_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities(organization_id,lead_id,type,description,logged_by) VALUES(NEW.organization_id,NEW.id,'Note','Lead created',auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO activities(organization_id,lead_id,type,description,logged_by) VALUES(NEW.organization_id,NEW.id,'Note','Stage changed from ' || OLD.status || ' to ' || NEW.status,auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER record_lead_activity AFTER INSERT OR UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION record_lead_activity();
COMMIT;
