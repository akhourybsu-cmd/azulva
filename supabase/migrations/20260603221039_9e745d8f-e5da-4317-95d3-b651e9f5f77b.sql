-- Ensure slug is unique so we can idempotently upsert standard source playbook rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deal_sources_slug_unique'
  ) THEN
    ALTER TABLE public.deal_sources
      ADD CONSTRAINT deal_sources_slug_unique UNIQUE (slug);
  END IF;
END$$;

-- Idempotently seed/upsert the standard deal source playbook rows.
INSERT INTO public.deal_sources
  (name, slug, source_type, base_url, affiliate_supported, api_supported, enabled, trust_level, notes, approved_linking_method, requires_manual_verification, default_disclaimer)
VALUES
  ('Manual Curated', 'manual-curated', 'manual', NULL, false, false, true, 'high',
   'Manually verified curated deal.',
   'direct_source_url', true,
   'This deal was manually curated and verified before publishing.'),
  ('Mock Demo', 'mock-demo', 'mock', NULL, false, false, true, 'low',
   'Sample/demo content. Not a real price.',
   'reference_only', false,
   'This is a sample/demo source and should not be treated as a live price.'),
  ('Travelpayouts', 'travelpayouts', 'affiliate', 'https://www.travelpayouts.com', true, true, true, 'medium',
   'Affiliate-ready. Generated partner links when configured.',
   'generated_affiliate_url', false,
   'This link may route through an affiliate partner when available.'),
  ('Expedia Affiliate Placeholder', 'expedia-affiliate', 'affiliate', 'https://www.expedia.com', true, false, true, 'medium',
   'Placeholder for Expedia affiliate program. Not fully integrated.',
   'manual_affiliate_url', true,
   'This link may route through an affiliate partner when available. Verify pricing on Expedia before booking.'),
  ('CheapCaribbean Placeholder', 'cheapcaribbean', 'affiliate', 'https://www.cheapcaribbean.com', true, false, true, 'medium',
   'Placeholder for CheapCaribbean affiliate program.',
   'manual_affiliate_url', true,
   'This link may route through an affiliate partner when available. Verify pricing on CheapCaribbean before booking.'),
  ('Apple Vacations Placeholder', 'apple-vacations', 'affiliate', 'https://www.applevacations.com', true, false, true, 'medium',
   'Placeholder for Apple Vacations affiliate program.',
   'manual_affiliate_url', true,
   'This link may route through an affiliate partner when available. Verify pricing on Apple Vacations before booking.'),
  ('Vacation Express Placeholder', 'vacation-express', 'affiliate', 'https://www.vacationexpress.com', true, false, true, 'medium',
   'Placeholder for Vacation Express affiliate program.',
   'manual_affiliate_url', true,
   'This link may route through an affiliate partner when available. Verify pricing on Vacation Express before booking.'),
  ('Costco Travel Reference Only', 'costco-travel', 'manual', 'https://www.costcotravel.com', false, false, true, 'high',
   'Reference only. Costco Travel does not currently support affiliate links.',
   'reference_only', true,
   'Costco Travel is included as a reference only — please verify directly on Costco Travel.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  source_type = EXCLUDED.source_type,
  base_url = COALESCE(public.deal_sources.base_url, EXCLUDED.base_url),
  affiliate_supported = EXCLUDED.affiliate_supported,
  api_supported = EXCLUDED.api_supported,
  trust_level = EXCLUDED.trust_level,
  notes = COALESCE(public.deal_sources.notes, EXCLUDED.notes),
  approved_linking_method = COALESCE(public.deal_sources.approved_linking_method, EXCLUDED.approved_linking_method),
  requires_manual_verification = EXCLUDED.requires_manual_verification,
  default_disclaimer = COALESCE(public.deal_sources.default_disclaimer, EXCLUDED.default_disclaimer),
  updated_at = now();