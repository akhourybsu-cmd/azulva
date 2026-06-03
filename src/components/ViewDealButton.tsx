// Renders an outbound CTA that records a tracked click before redirecting.
import { ExternalLink } from "lucide-react";
import type { ClickedFrom, Deal } from "@/lib/types";
import { storeActions } from "@/lib/store";
import { describeAffiliateState } from "@/lib/affiliates/AffiliateLinkService";

type UrlPick = { url: string; kind: "direct" | "manual_affiliate" | "generated_affiliate" } | null;

function chooseUrl(deal: Pick<Deal, "sourceUrl" | "affiliateUrl" | "generatedAffiliateUrl">): UrlPick {
  const s = describeAffiliateState(deal.sourceUrl, deal.affiliateUrl, deal.generatedAffiliateUrl);
  if (s.kind === "direct" || s.kind === "manual_affiliate" || s.kind === "generated_affiliate") {
    return { url: s.url, kind: s.kind };
  }
  return null;
}

export function ViewDealButton({
  deal,
  className,
  children,
  referrer,
  clickedFrom,
  tripRoomId,
  watchlistId,
}: {
  deal: Deal;
  className?: string;
  children?: React.ReactNode;
  referrer?: string;
  clickedFrom?: ClickedFrom;
  tripRoomId?: string | null;
  watchlistId?: string | null;
}) {
  const picked = chooseUrl(deal);
  if (!picked) {
    return (
      <span className={`${className ?? ""} cursor-not-allowed opacity-60`} title="No outbound URL configured">
        {children ?? "View Deal"}
      </span>
    );
  }
  const { url, kind } = picked;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        storeActions.recordOutboundClick({
          id: crypto.randomUUID(),
          dealId: deal.id,
          outboundUrl: url,
          affiliateUrl: deal.generatedAffiliateUrl ?? deal.affiliateUrl ?? null,
          sourceId: deal.sourceId ?? null,
          destinationId: deal.destinationId,
          departureAirport: deal.departureAirport,
          referrer: referrer ?? (typeof window !== "undefined" ? window.location.pathname : null),
          clickedAt: new Date().toISOString(),
          clickedFrom: clickedFrom ?? "other",
          tripRoomId: tripRoomId ?? null,
          watchlistId: watchlistId ?? null,
          generatedAffiliateUsed: kind === "generated_affiliate",
          manualAffiliateUsed: kind === "manual_affiliate",
          directSourceUsed: kind === "direct",
        })
      }
      className={className}
    >
      {children ?? (
        <span className="inline-flex items-center gap-1">
          View Deal <ExternalLink className="h-3.5 w-3.5" />
        </span>
      )}
    </a>
  );
}
