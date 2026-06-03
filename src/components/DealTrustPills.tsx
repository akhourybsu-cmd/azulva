// Trust + freshness pills for deals. Concise, no clutter.
import type { Deal } from "@/lib/types";
import { freshnessOf, freshnessLabel, freshnessTone, expiringSoon } from "@/lib/dealFreshness";
import { describeAffiliateState } from "@/lib/affiliates/AffiliateLinkService";

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {children}
    </span>
  );
}

export function SourceTrustPill({ deal }: { deal: Pick<Deal, "sourceLabel"> }) {
  const isSample = deal.sourceLabel === "Sample Deal";
  const tone = isSample
    ? "bg-muted text-muted-foreground border border-border"
    : "bg-[var(--ocean)]/15 text-[var(--ocean)]";
  return <Pill tone={tone}>{isSample ? "Sample Deal" : "Curated Deal"}</Pill>;
}

export function FreshnessPill({ deal }: { deal: Pick<Deal, "lastCheckedAt" | "expiresAt" | "status"> }) {
  const f = freshnessOf(deal);
  return <Pill tone={freshnessTone(f)}>{freshnessLabel(f)}</Pill>;
}

export function AffiliatePill({ deal }: { deal: Pick<Deal, "sourceUrl" | "affiliateUrl" | "generatedAffiliateUrl"> }) {
  const s = describeAffiliateState(deal.sourceUrl, deal.affiliateUrl, deal.generatedAffiliateUrl);
  if (s.kind === "none") return null;
  if (s.kind === "direct") return null;
  return <Pill tone="bg-[var(--coral)]/15 text-[var(--coral)]">Affiliate Link</Pill>;
}

export function ExpiringSoonPill({ deal }: { deal: Pick<Deal, "expiresAt"> }) {
  if (!expiringSoon(deal)) return null;
  return <Pill tone="bg-[var(--warning)]/20 text-[var(--warning)]">Expires Soon</Pill>;
}

export function AllInclusivePill({ deal }: { deal: Pick<Deal, "allInclusiveConfidence"> }) {
  if (deal.allInclusiveConfidence === "Confirmed")
    return <Pill tone="bg-[var(--success)]/15 text-[var(--success)]">All-Inclusive Confirmed</Pill>;
  if (deal.allInclusiveConfidence === "Unclear" || deal.allInclusiveConfidence === "Unknown")
    return <Pill tone="bg-[var(--warning)]/15 text-[var(--warning)]">All-Inclusive Unclear</Pill>;
  return null;
}

/** Compact trust label row used on deal cards. */
export function DealTrustPills({ deal, dense }: { deal: Deal; dense?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${dense ? "" : "gap-2"}`}>
      <SourceTrustPill deal={deal} />
      <FreshnessPill deal={deal} />
      <AffiliatePill deal={deal} />
      <ExpiringSoonPill deal={deal} />
    </div>
  );
}
