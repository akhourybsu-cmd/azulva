
-- Admin roles
DO $$ BEGIN
  CREATE TYPE public.admin_role AS ENUM ('owner','admin','editor','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.admin_role NOT NULL DEFAULT 'admin',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own admin row" ON public.admin_users;
CREATE POLICY "Users see own admin row" ON public.admin_users
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Role helpers
CREATE OR REPLACE FUNCTION public.is_admin(_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = _user AND role IN ('owner','admin','editor')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_admin_role(_required text, _user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = _user
      AND (
        (_required = 'viewer' AND role::text IN ('owner','admin','editor','viewer'))
        OR (_required = 'editor' AND role::text IN ('owner','admin','editor'))
        OR (_required = 'admin'  AND role::text IN ('owner','admin'))
        OR (_required = 'owner'  AND role::text = 'owner')
      )
  )
$$;

-- deal_sources: tighten writes to admins/editors; reads remain public
DROP POLICY IF EXISTS "Authenticated users delete deal sources" ON public.deal_sources;
DROP POLICY IF EXISTS "Authenticated users manage deal sources" ON public.deal_sources;
DROP POLICY IF EXISTS "Authenticated users update deal sources" ON public.deal_sources;

CREATE POLICY "Admins insert deal sources" ON public.deal_sources
  FOR INSERT TO authenticated WITH CHECK (public.has_admin_role('editor'));
CREATE POLICY "Admins update deal sources" ON public.deal_sources
  FOR UPDATE TO authenticated USING (public.has_admin_role('editor'))
  WITH CHECK (public.has_admin_role('editor'));
CREATE POLICY "Admins delete deal sources" ON public.deal_sources
  FOR DELETE TO authenticated USING (public.has_admin_role('admin'));

-- custom_deals: only admins/editors can write
DROP POLICY IF EXISTS "Authenticated users create custom deals" ON public.custom_deals;
DROP POLICY IF EXISTS "Creators delete custom deals" ON public.custom_deals;
DROP POLICY IF EXISTS "Creators update custom deals" ON public.custom_deals;

CREATE POLICY "Admins create custom deals" ON public.custom_deals
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_role('editor') AND created_by = auth.uid());
CREATE POLICY "Admins update custom deals" ON public.custom_deals
  FOR UPDATE TO authenticated
  USING (public.has_admin_role('editor'))
  WITH CHECK (public.has_admin_role('editor'));
CREATE POLICY "Admins delete custom deals" ON public.custom_deals
  FOR DELETE TO authenticated USING (public.has_admin_role('admin'));

-- price_snapshots: only admins/editors can insert; only admins delete
DROP POLICY IF EXISTS "Authenticated users add snapshots" ON public.price_snapshots;
DROP POLICY IF EXISTS "Capturers delete snapshots" ON public.price_snapshots;

CREATE POLICY "Admins add snapshots" ON public.price_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_admin_role('editor')
    AND (captured_by_user IS NULL OR captured_by_user = auth.uid())
  );
CREATE POLICY "Admins delete snapshots" ON public.price_snapshots
  FOR DELETE TO authenticated USING (public.has_admin_role('admin'));

-- Slug uniqueness for deal_sources (idempotent)
DO $$ BEGIN
  ALTER TABLE public.deal_sources ADD CONSTRAINT deal_sources_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- Seed stable mock/manual sources
INSERT INTO public.deal_sources (name, slug, source_type, trust_level, enabled, affiliate_supported, api_supported, notes)
VALUES
  ('Mock Demo', 'mock-demo', 'mock', 'low', true, false, false, 'Sample/demo deals used during development.'),
  ('Manual Curated', 'manual-curated', 'manual', 'medium', true, false, false, 'Admin-curated deals entered by hand.')
ON CONFLICT (slug) DO NOTHING;
