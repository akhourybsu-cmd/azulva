// Waitlist signup helpers. Public callers go through the submit_waitlist
// SECURITY DEFINER RPC so we don't need a permissive UPDATE policy.
import { supabase } from "@/integrations/supabase/client";

export type WaitlistInput = {
  email: string;
  name?: string | null;
  homeAirport?: string | null;
  preferredDestinations?: string[] | null;
  maxBudgetPerPerson?: number | null;
  tripType?: string | null;
  groupSize?: number | null;
  priorities?: string[] | null;
  referredBy?: string | null;
  source?: string | null;
};

export type WaitlistResult = {
  ok: boolean;
  id?: string;
  referralCode?: string;
  wasExisting?: boolean;
  error?: string;
};

export const TRIP_TYPES = [
  "Couples trip",
  "Friend group",
  "Family trip",
  "Bachelor/bachelorette",
  "Honeymoon",
  "Solo escape",
  "Not sure yet",
] as const;

export const PRIORITIES = [
  "Lowest price",
  "Adults-only",
  "Luxury",
  "Nonstop flights",
  "Family-friendly",
  "Group consensus",
] as const;

export async function submitWaitlist(input: WaitlistInput): Promise<WaitlistResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  const { data, error } = await supabase.rpc("submit_waitlist", {
    _email: email,
    _name: input.name ?? undefined,
    _home_airport: input.homeAirport ?? undefined,
    _preferred_destinations: input.preferredDestinations ?? undefined,
    _max_budget_per_person: input.maxBudgetPerPerson ?? undefined,
    _trip_type: input.tripType ?? undefined,
    _group_size: input.groupSize ?? undefined,
    _priorities: input.priorities ?? undefined,
    _referred_by: input.referredBy ?? undefined,
    _source: input.source ?? undefined,
  });
  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: "Signup failed." };
  return {
    ok: true,
    id: row.id as string,
    referralCode: row.referral_code as string,
    wasExisting: row.was_existing as boolean,
  };
}

export function referralUrl(code: string): string {
  if (typeof window === "undefined") return `?ref=${code}`;
  return `${window.location.origin}/?ref=${code}`;
}

export function readReferralFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  return sp.get("ref");
}
