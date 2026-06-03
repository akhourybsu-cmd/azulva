
-- ============ deal_sources ============
CREATE TABLE IF NOT EXISTS public.deal_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  source_type text NOT NULL CHECK (source_type IN ('manual','affiliate','api','partner','mock')),
  base_url text,
  affiliate_supported boolean NOT NULL DEFAULT false,
  api_supported boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  trust_level text NOT NULL DEFAULT 'unknown' CHECK (trust_level IN ('high','medium','low','unknown')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.deal_sources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.deal_sources TO authenticated;
GRANT ALL ON public.deal_sources TO service_role;

ALTER TABLE public.deal_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal sources are world-readable"
  ON public.deal_sources FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated users manage deal sources"
  ON public.deal_sources FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users update deal sources"
  ON public.deal_sources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users delete deal sources"
  ON public.deal_sources FOR DELETE TO authenticated USING (true);

CREATE TRIGGER deal_sources_updated_at
  BEFORE UPDATE ON public.deal_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ price_snapshots ============
CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id text NOT NULL,
  source_id uuid REFERENCES public.deal_sources(id) ON DELETE SET NULL,
  destination_slug text,
  resort_name text,
  departure_airport text,
  start_date date,
  end_date date,
  nights integer,
  price_per_person numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  flight_included boolean,
  source_url text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by text NOT NULL DEFAULT 'manual' CHECK (captured_by IN ('manual','api','scheduled_job')),
  captured_by_user uuid,
  notes text
);

CREATE INDEX IF NOT EXISTS price_snapshots_deal_idx ON public.price_snapshots (deal_id, captured_at DESC);

GRANT SELECT ON public.price_snapshots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.price_snapshots TO authenticated;
GRANT ALL ON public.price_snapshots TO service_role;

ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price snapshots world-readable"
  ON public.price_snapshots FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated users add snapshots"
  ON public.price_snapshots FOR INSERT TO authenticated
  WITH CHECK (captured_by_user IS NULL OR captured_by_user = auth.uid());

CREATE POLICY "Capturers delete snapshots"
  ON public.price_snapshots FOR DELETE TO authenticated
  USING (captured_by_user = auth.uid());

-- ============ extend outbound_clicks ============
ALTER TABLE public.outbound_clicks
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.deal_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS outbound_url text,
  ADD COLUMN IF NOT EXISTS affiliate_url text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS destination_id text,
  ADD COLUMN IF NOT EXISTS departure_airport text;

-- ============ seed initial sources ============
INSERT INTO public.deal_sources (name, slug, source_type, trust_level, affiliate_supported, api_supported, enabled, notes) VALUES
  ('Manual Curated', 'manual-curated', 'manual', 'high', false, false, true, 'Hand-curated by Azulva editors.'),
  ('Mock Demo', 'mock-demo', 'mock', 'low', false, false, true, 'Sample inventory for demos. Not bookable.'),
  ('Travelpayouts', 'travelpayouts', 'affiliate', 'medium', true, true, true, 'Affiliate-ready. Requires TRAVELPAYOUTS_TOKEN.'),
  ('Expedia Affiliate Placeholder', 'expedia-affiliate', 'affiliate', 'medium', true, false, true, 'Placeholder. Not yet integrated.'),
  ('CheapCaribbean Placeholder', 'cheapcaribbean', 'partner', 'medium', false, false, true, 'Placeholder. Manual links only.'),
  ('Apple Vacations Placeholder', 'apple-vacations', 'partner', 'medium', false, false, true, 'Placeholder. Manual links only.'),
  ('Vacation Express Placeholder', 'vacation-express', 'partner', 'medium', false, false, true, 'Placeholder. Manual links only.'),
  ('Costco Travel Reference Only', 'costco-travel', 'partner', 'medium', false, false, true, 'Reference benchmark only. No affiliate.')
ON CONFLICT (slug) DO NOTHING;
