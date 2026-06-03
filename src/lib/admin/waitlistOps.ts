// Admin-only loaders for waitlist + feedback analytics.
import { supabase } from "@/integrations/supabase/client";

export type WaitlistRow = {
  id: string;
  email: string;
  name: string | null;
  home_airport: string | null;
  preferred_destinations: string[] | null;
  max_budget_per_person: number | null;
  trip_type: string | null;
  group_size: number | null;
  priorities: string[] | null;
  referral_code: string | null;
  referred_by: string | null;
  source: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type FeedbackRow = {
  id: string;
  email: string | null;
  page: string | null;
  feedback_type: string;
  message: string;
  rating: number | null;
  user_id: string | null;
  created_at: string;
};

export async function loadWaitlist(limit = 500): Promise<WaitlistRow[]> {
  const { data, error } = await supabase
    .from("waitlist_signups")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[waitlist] load", error);
    return [];
  }
  return data as WaitlistRow[];
}

export async function loadFeedback(limit = 200): Promise<FeedbackRow[]> {
  const { data, error } = await supabase
    .from("feedback_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[feedback] load", error);
    return [];
  }
  return data as FeedbackRow[];
}

export async function updateWaitlistStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("waitlist_signups").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateWaitlistNote(id: string, note: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("waitlist_signups").update({ admin_note: note }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteWaitlist(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("waitlist_signups").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type WaitlistAnalytics = {
  total: number;
  byDay: { day: string; count: number }[];
  topAirports: { label: string; count: number }[];
  topDestinations: { label: string; count: number }[];
  averageBudget: number | null;
  byTripType: { label: string; count: number }[];
  topReferrers: { label: string; count: number }[];
};

export function computeWaitlistAnalytics(rows: WaitlistRow[]): WaitlistAnalytics {
  const byDay = new Map<string, number>();
  const airports = new Map<string, number>();
  const dests = new Map<string, number>();
  const tt = new Map<string, number>();
  const refs = new Map<string, number>();
  let budgetSum = 0;
  let budgetCount = 0;
  rows.forEach((r) => {
    const day = r.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    if (r.home_airport) airports.set(r.home_airport, (airports.get(r.home_airport) ?? 0) + 1);
    (r.preferred_destinations ?? []).forEach((d) => dests.set(d, (dests.get(d) ?? 0) + 1));
    if (r.trip_type) tt.set(r.trip_type, (tt.get(r.trip_type) ?? 0) + 1);
    if (r.referred_by) refs.set(r.referred_by, (refs.get(r.referred_by) ?? 0) + 1);
    if (r.max_budget_per_person) { budgetSum += r.max_budget_per_person; budgetCount++; }
  });
  const toRows = (m: Map<string, number>) =>
    Array.from(m.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  return {
    total: rows.length,
    byDay: Array.from(byDay.entries()).map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
    topAirports: toRows(airports).slice(0, 10),
    topDestinations: toRows(dests).slice(0, 10),
    averageBudget: budgetCount > 0 ? Math.round(budgetSum / budgetCount) : null,
    byTripType: toRows(tt),
    topReferrers: toRows(refs).slice(0, 10),
  };
}

export function toCsv(rows: WaitlistRow[]): string {
  const headers = [
    "email", "name", "home_airport", "preferred_destinations", "max_budget_per_person",
    "trip_type", "group_size", "priorities", "referral_code", "referred_by", "source",
    "status", "created_at",
  ];
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join("|") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    lines.push([
      r.email, r.name, r.home_airport, r.preferred_destinations,
      r.max_budget_per_person, r.trip_type, r.group_size, r.priorities,
      r.referral_code, r.referred_by, r.source, r.status, r.created_at,
    ].map(escape).join(","));
  });
  return lines.join("\n");
}
