// Deal operations: pure helpers + cloud-backed mutators. These compose with
// `storeActions.updateCustomDeal` (added in store.ts). Only `customDeals`
// can be edited from the admin UI; mock seed deals are read-only.
import type { Deal } from "@/lib/types";
import { mockResorts } from "@/lib/data/mockResorts";
import { calculateDealScore } from "@/lib/scoring/DealScoringService";
import type { DealSourceRow } from "./dealSources";

/** Resolve a stable sourceId for any deal, falling back to label-based slugs. */
export function resolveSourceId(
  deal: Pick<Deal, "sourceId" | "sourceLabel">,
  sources: DealSourceRow[],
): string | null {
  if (deal.sourceId) return deal.sourceId;
  const slug =
    deal.sourceLabel === "Sample Deal" ? "mock-demo"
    : deal.sourceLabel === "Curated Deal" ? "manual-curated"
    : deal.sourceLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return sources.find((s) => s.slug === slug)?.id ?? null;
}

export function resolveSourceName(
  deal: Pick<Deal, "sourceId" | "sourceLabel">,
  sources: DealSourceRow[],
): string {
  const id = resolveSourceId(deal, sources);
  if (id) {
    const found = sources.find((s) => s.id === id);
    if (found) return found.name;
  }
  return deal.sourceLabel;
}

/** Apply backfilled sourceId to a list of deals without mutating originals. */
export function withResolvedSources(deals: Deal[], sources: DealSourceRow[]): Deal[] {
  return deals.map((d) => ({ ...d, sourceId: resolveSourceId(d, sources) }));
}

// ---- mutator builders (return next deal) ----

export function flagDeal(d: Deal, reason: string, flaggedBy?: string): Deal {
  return {
    ...d,
    status: "flagged",
    flaggedReason: reason || "Flagged for review",
    adminNotes: [d.adminNotes, flaggedBy ? `Flagged by ${flaggedBy} at ${new Date().toISOString()}` : null]
      .filter(Boolean).join("\n"),
  };
}
export function unflagDeal(d: Deal): Deal {
  return { ...d, status: "active", flaggedReason: undefined };
}
export function expireDeal(d: Deal): Deal {
  return { ...d, status: "expired", expiresAt: d.expiresAt ?? new Date().toISOString() };
}
export function archiveDeal(d: Deal): Deal {
  return {
    ...d,
    status: "archived",
    adminNotes: [d.adminNotes, `Archived ${new Date().toISOString()}`].filter(Boolean).join("\n"),
  };
}
export function restoreDeal(d: Deal): Deal {
  return { ...d, status: "active" };
}
export function markVerifiedToday(d: Deal, verifiedBy?: string): Deal {
  return {
    ...d,
    lastCheckedAt: new Date().toISOString(),
    adminNotes: verifiedBy
      ? [d.adminNotes, `Verified by ${verifiedBy} at ${new Date().toISOString()}`].filter(Boolean).join("\n")
      : d.adminNotes,
  };
}

export function recalculateScore(d: Deal): Deal {
  const resort = mockResorts.find((r) => r.id === d.resortId);
  const daysOut = Math.max(0, Math.round((new Date(d.startDate).getTime() - Date.now()) / 86400000));
  const benchmark = Math.round(d.pricePerPerson * 1.25); // assume 25% benchmark if unknown
  const score = calculateDealScore({
    pricePerPerson: d.pricePerPerson,
    benchmarkPrice: benchmark,
    resortGuestRating: resort?.guestRating ?? 8,
    resortStarRating: resort?.starRating ?? 4,
    nights: d.nights,
    flightIncluded: d.flightIncluded === "included",
    nonstopLikely: true,
    allInclusiveConfidence: d.allInclusiveConfidence,
    refundable: d.refundable === "included",
    daysUntilDeparture: daysOut,
  });
  return { ...d, ...score };
}

export function duplicateDeal(d: Deal): Deal {
  return {
    ...d,
    id: "custom-" + crypto.randomUUID().slice(0, 8),
    title: `${d.title} (copy)`,
    status: "draft",
    lastCheckedAt: new Date().toISOString(),
  };
}
