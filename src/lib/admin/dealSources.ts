// Client helpers for deal_sources. Public-readable; mutations require auth.
import { supabase } from "@/integrations/supabase/client";

export type DealSourceRow = {
  id: string;
  name: string;
  slug: string;
  source_type: "manual" | "affiliate" | "api" | "partner" | "mock";
  base_url: string | null;
  affiliate_supported: boolean;
  api_supported: boolean;
  enabled: boolean;
  trust_level: "high" | "medium" | "low" | "unknown";
  notes: string | null;
  approved_linking_method?: string | null;
  requires_manual_verification?: boolean;
  default_disclaimer?: string | null;
};

const COLUMNS =
  "id, name, slug, source_type, base_url, affiliate_supported, api_supported, enabled, trust_level, notes, approved_linking_method, requires_manual_verification, default_disclaimer";

export async function loadDealSources(): Promise<DealSourceRow[]> {
  const { data, error } = await supabase
    .from("deal_sources")
    .select(COLUMNS)
    .order("name");
  if (error || !data) return [];
  return data as unknown as DealSourceRow[];
}

export async function upsertDealSource(s: Omit<DealSourceRow, "id"> & { id?: string }) {
  const payload = {
    name: s.name,
    slug: s.slug,
    source_type: s.source_type,
    base_url: s.base_url,
    affiliate_supported: s.affiliate_supported,
    api_supported: s.api_supported,
    enabled: s.enabled,
    trust_level: s.trust_level,
    notes: s.notes,
    approved_linking_method: s.approved_linking_method ?? null,
    requires_manual_verification: s.requires_manual_verification ?? false,
    default_disclaimer: s.default_disclaimer ?? null,
  };
  if (s.id) {
    const { error } = await supabase.from("deal_sources").update(payload).eq("id", s.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: s.id };
  }
  const { data, error } = await supabase.from("deal_sources").insert(payload).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id as string | undefined };
}

export async function toggleDealSourceEnabled(id: string, enabled: boolean) {
  await supabase.from("deal_sources").update({ enabled }).eq("id", id);
}

export async function deleteDealSource(id: string) {
  await supabase.from("deal_sources").delete().eq("id", id);
}
