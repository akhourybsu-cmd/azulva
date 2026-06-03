// Freshness + trust helpers for deals.
import type { Deal } from "./types";

export type Freshness = "fresh" | "recent" | "aging" | "stale" | "expired";

export function freshnessOf(deal: Pick<Deal, "lastCheckedAt" | "expiresAt" | "status">): Freshness {
  if (deal.status === "expired") return "expired";
  if (deal.expiresAt && new Date(deal.expiresAt).getTime() < Date.now()) return "expired";
  const ageMs = Date.now() - new Date(deal.lastCheckedAt).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (ageMs <= day) return "fresh";
  if (ageMs <= 3 * day) return "recent";
  if (ageMs <= 7 * day) return "aging";
  return "stale";
}

export function freshnessLabel(f: Freshness): string {
  switch (f) {
    case "fresh": return "Price Checked Today";
    case "recent": return "Recently Checked";
    case "aging": return "Verify Before Booking";
    case "stale": return "Price May Have Changed";
    case "expired": return "Expired";
  }
}

export function freshnessTone(f: Freshness): string {
  switch (f) {
    case "fresh": return "bg-[var(--success)]/15 text-[var(--success)]";
    case "recent": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "aging": return "bg-[var(--warning)]/15 text-[var(--warning)]";
    case "stale": return "bg-[var(--warning)]/20 text-[var(--warning)]";
    case "expired": return "bg-destructive/15 text-destructive";
  }
}

export function expiringSoon(deal: Pick<Deal, "expiresAt">): boolean {
  if (!deal.expiresAt) return false;
  const ms = new Date(deal.expiresAt).getTime() - Date.now();
  return ms > 0 && ms < 3 * 24 * 60 * 60 * 1000;
}
