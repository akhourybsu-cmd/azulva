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
};

export async function loadDealSources(): Promise<DealSourceRow[]> {
  const { data, error } = await supabase
    .from("deal_sources")
    .select("id, name, slug, source_type, base_url, affiliate_supported, api_supported, enabled, trust_level, notes")
    .order("name");
  if (error || !data) return [];
  return data as DealSourceRow[];
}

export async function upsertDealSource(s: Omit<DealSourceRow, "id"> & { id?: string }) {
  if (s.id) {
    const { error } = await supabase
      .from("deal_sources")
      .update({
        name: s.name, slug: s.slug, source_type: s.source_type, base_url: s.base_url,
        affiliate_supported: s.affiliate_supported, api_supported: s.api_supported,
        enabled: s.enabled, trust_level: s.trust_level, notes: s.notes,
      })
      .eq("id", s.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const { error } = await supabase.from("deal_sources").insert({
    name: s.name, slug: s.slug, source_type: s.source_type, base_url: s.base_url,
    affiliate_supported: s.affiliate_supported, api_supported: s.api_supported,
    enabled: s.enabled, trust_level: s.trust_level, notes: s.notes,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleDealSourceEnabled(id: string, enabled: boolean) {
  await supabase.from("deal_sources").update({ enabled }).eq("id", id);
}

export async function deleteDealSource(id: string) {
  await supabase.from("deal_sources").delete().eq("id", id);
}
