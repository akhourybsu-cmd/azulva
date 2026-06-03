
-- Phase 4A: extend outbound_clicks and deal_sources for affiliate provenance + source playbook fields

ALTER TABLE public.outbound_clicks
  ADD COLUMN IF NOT EXISTS clicked_from text,
  ADD COLUMN IF NOT EXISTS trip_room_id uuid,
  ADD COLUMN IF NOT EXISTS watchlist_id uuid,
  ADD COLUMN IF NOT EXISTS generated_affiliate_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_affiliate_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS direct_source_used boolean NOT NULL DEFAULT false;

ALTER TABLE public.deal_sources
  ADD COLUMN IF NOT EXISTS approved_linking_method text,
  ADD COLUMN IF NOT EXISTS requires_manual_verification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_disclaimer text;
