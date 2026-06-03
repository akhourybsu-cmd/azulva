// Client helpers for price snapshots. RLS allows any authenticated user to
// read and to insert their own (captured_by_user = auth.uid()).
import { supabase } from "@/integrations/supabase/client";

export type PriceSnapshotRow = {
  id: string;
  deal_id: string;
  price_per_person: number;
  currency: string;
  captured_at: string;
  source_id: string | null;
  resort_name: string | null;
  departure_airport: string | null;
  start_date: string | null;
  end_date: string | null;
  nights: number | null;
  source_url: string | null;
  captured_by: string;
  notes: string | null;
};

export async function loadSnapshotsForDeal(dealId: string): Promise<PriceSnapshotRow[]> {
  const { data, error } = await supabase
    .from("price_snapshots")
    .select("*")
    .eq("deal_id", dealId)
    .order("captured_at", { ascending: true })
    .limit(200);
  if (error) {
    console.error("[snapshots] load", error);
    return [];
  }
  return data as PriceSnapshotRow[];
}

export async function addSnapshot(input: {
  dealId: string;
  pricePerPerson: number;
  currency?: string;
  sourceId?: string | null;
  resortName?: string | null;
  departureAirport?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  nights?: number | null;
  sourceUrl?: string | null;
  notes?: string | null;
  capturedByUser: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("price_snapshots").insert({
    deal_id: input.dealId,
    price_per_person: input.pricePerPerson,
    currency: input.currency ?? "USD",
    source_id: input.sourceId ?? null,
    resort_name: input.resortName ?? null,
    departure_airport: input.departureAirport ?? null,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    nights: input.nights ?? null,
    source_url: input.sourceUrl ?? null,
    notes: input.notes ?? null,
    captured_by: "manual",
    captured_by_user: input.capturedByUser,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type ClickAnalytics = {
  total: number;
  bySource: { source_id: string | null; count: number }[];
  byDeal: { deal_id: string; count: number }[];
  byDestination: { destination_id: string | null; count: number }[];
  byClickedFrom: { clicked_from: string; count: number }[];
  byTripRoom: { trip_room_id: string; count: number }[];
  byWatchlist: { watchlist_id: string; count: number }[];
  topDealsByTripRoom: { deal_id: string; count: number }[];
  topDealsByWatchlist: { deal_id: string; count: number }[];
  unknownAttributionCount: number;
  missingTripRoomFromTripRoom: number;
  missingWatchlistFromWatchlist: number;
  dealClicksMissingAffiliateUrl: { deal_id: string; count: number }[];
  signedInVsAnon: { signed_in: number; anon: number };
  recent: Array<{ id: string; deal_id: string; created_at: string; outbound_url: string | null; affiliate_url: string | null; destination_id: string | null; user_id: string | null; clicked_from: string | null; trip_room_id: string | null; watchlist_id: string | null }>;
};

export async function loadClickAnalytics(): Promise<ClickAnalytics> {
  const empty: ClickAnalytics = {
    total: 0, bySource: [], byDeal: [], byDestination: [], byClickedFrom: [],
    byTripRoom: [], byWatchlist: [], topDealsByTripRoom: [], topDealsByWatchlist: [],
    unknownAttributionCount: 0, missingTripRoomFromTripRoom: 0, missingWatchlistFromWatchlist: 0,
    dealClicksMissingAffiliateUrl: [],
    signedInVsAnon: { signed_in: 0, anon: 0 }, recent: [],
  };
  const { data, error } = await supabase
    .from("outbound_clicks")
    .select("id, deal_id, source_id, destination_id, outbound_url, affiliate_url, user_id, created_at, clicked_from, trip_room_id, watchlist_id, direct_source_used, manual_affiliate_used, generated_affiliate_used")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) return empty;
  const bySource = new Map<string | null, number>();
  const byDeal = new Map<string, number>();
  const byDest = new Map<string | null, number>();
  const byFrom = new Map<string, number>();
  const byRoom = new Map<string, number>();
  const byWatch = new Map<string, number>();
  const dealsByRoom = new Map<string, number>();
  const dealsByWatch = new Map<string, number>();
  const dealsNoAff = new Map<string, number>();
  let signed = 0, anon = 0, unknown = 0;
  let missingRoom = 0, missingWatch = 0;
  data.forEach((r) => {
    const row = r as typeof r & { trip_room_id?: string | null; watchlist_id?: string | null; direct_source_used?: boolean; manual_affiliate_used?: boolean; generated_affiliate_used?: boolean };
    bySource.set(row.source_id, (bySource.get(row.source_id) ?? 0) + 1);
    byDeal.set(row.deal_id, (byDeal.get(row.deal_id) ?? 0) + 1);
    byDest.set(row.destination_id, (byDest.get(row.destination_id) ?? 0) + 1);
    const cf = row.clicked_from ?? "other";
    byFrom.set(cf, (byFrom.get(cf) ?? 0) + 1);
    if (cf === "other" || !row.clicked_from) unknown++;
    if (row.trip_room_id) {
      byRoom.set(row.trip_room_id, (byRoom.get(row.trip_room_id) ?? 0) + 1);
      dealsByRoom.set(row.deal_id, (dealsByRoom.get(row.deal_id) ?? 0) + 1);
    }
    if (row.watchlist_id) {
      byWatch.set(row.watchlist_id, (byWatch.get(row.watchlist_id) ?? 0) + 1);
      dealsByWatch.set(row.deal_id, (dealsByWatch.get(row.deal_id) ?? 0) + 1);
    }
    if (cf === "trip_room" && !row.trip_room_id) missingRoom++;
    if (cf === "watchlist" && !row.watchlist_id) missingWatch++;
    const directOnly = row.direct_source_used && !row.manual_affiliate_used && !row.generated_affiliate_used;
    if (directOnly) dealsNoAff.set(row.deal_id, (dealsNoAff.get(row.deal_id) ?? 0) + 1);
    if (row.user_id) signed++; else anon++;
  });
  return {
    total: data.length,
    bySource: Array.from(bySource.entries()).map(([source_id, count]) => ({ source_id, count })).sort((a, b) => b.count - a.count),
    byDeal: Array.from(byDeal.entries()).map(([deal_id, count]) => ({ deal_id, count })).sort((a, b) => b.count - a.count).slice(0, 20),
    byDestination: Array.from(byDest.entries()).map(([destination_id, count]) => ({ destination_id, count })).sort((a, b) => b.count - a.count),
    byClickedFrom: Array.from(byFrom.entries()).map(([clicked_from, count]) => ({ clicked_from, count })).sort((a, b) => b.count - a.count),
    byTripRoom: Array.from(byRoom.entries()).map(([trip_room_id, count]) => ({ trip_room_id, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    byWatchlist: Array.from(byWatch.entries()).map(([watchlist_id, count]) => ({ watchlist_id, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    topDealsByTripRoom: Array.from(dealsByRoom.entries()).map(([deal_id, count]) => ({ deal_id, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    topDealsByWatchlist: Array.from(dealsByWatch.entries()).map(([deal_id, count]) => ({ deal_id, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    unknownAttributionCount: unknown,
    missingTripRoomFromTripRoom: missingRoom,
    missingWatchlistFromWatchlist: missingWatch,
    dealClicksMissingAffiliateUrl: Array.from(dealsNoAff.entries()).map(([deal_id, count]) => ({ deal_id, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    signedInVsAnon: { signed_in: signed, anon },
    recent: data.slice(0, 30) as ClickAnalytics["recent"],
  };
}
