// Computes a "Ready to Publish" checklist for curated deals.
import type { Deal } from "./types";
import { freshnessOf } from "./dealFreshness";

export type ReadinessState =
  | "ready"
  | "needs_review"
  | "missing_critical"
  | "expired"
  | "flagged";

export interface ReadinessReport {
  state: ReadinessState;
  missing: string[];
  warnings: string[];
}

export function getReadiness(d: Deal): ReadinessReport {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!d.title?.trim()) missing.push("title");
  if (!d.resortId) missing.push("resort");
  if (!d.destinationId) missing.push("destination");
  if (!d.sourceLabel && !d.sourceId) missing.push("source");
  if (!d.sourceUrl && !d.affiliateUrl && !d.generatedAffiliateUrl) missing.push("source or affiliate URL");
  if (!d.pricePerPerson || d.pricePerPerson <= 0) missing.push("price per person");
  if (!d.currencyCode) missing.push("currency");
  if (!d.startDate || !d.endDate) missing.push("start/end dates");
  if (!d.nights || d.nights <= 0) missing.push("nights");
  if (!d.lastCheckedAt) missing.push("last checked date");
  if (d.allInclusiveConfidence === "Unknown") warnings.push("all-inclusive confidence unknown");
  if (!d.sourceConfidence || d.sourceConfidence === "unknown") warnings.push("source confidence unknown");

  let state: ReadinessState;
  if (d.status === "flagged") state = "flagged";
  else if (d.status === "expired") state = "expired";
  else if (missing.length > 0) state = "missing_critical";
  else if (warnings.length > 0 || d.status !== "active") state = "needs_review";
  else state = "ready";

  // freshness check escalates to needs_review
  if (state === "ready") {
    const f = freshnessOf(d);
    if (f === "stale" || f === "aging") {
      state = "needs_review";
      warnings.push("price not checked recently");
    }
  }

  return { state, missing, warnings };
}

export function readinessLabel(s: ReadinessState): string {
  switch (s) {
    case "ready": return "Ready";
    case "needs_review": return "Needs Review";
    case "missing_critical": return "Missing Critical Info";
    case "expired": return "Expired";
    case "flagged": return "Flagged";
  }
}

export function readinessColorClass(s: ReadinessState): string {
  switch (s) {
    case "ready": return "bg-[var(--success)]/15 text-[var(--success)]";
    case "needs_review": return "bg-[var(--warning)]/15 text-[var(--warning)]";
    case "missing_critical": return "bg-destructive/15 text-destructive";
    case "expired": return "bg-muted text-muted-foreground";
    case "flagged": return "bg-destructive/15 text-destructive";
  }
}
