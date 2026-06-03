// Renders an outbound CTA that records a tracked click before redirecting.
import { ExternalLink } from "lucide-react";
import type { Deal } from "@/lib/types";
import { storeActions } from "@/lib/store";
import { describeAffiliateState } from "@/lib/affiliates/AffiliateLinkService";

function chooseUrl(deal: Pick<Deal, "sourceUrl" | "affiliateUrl" | "generatedAffiliateUrl">) {
  const s = describeAffiliateState(deal.sourceUrl, deal.affiliateUrl, deal.generatedAffiliateUrl);
  if (s.kind === "none") return null;
  return s.url;
}

export function ViewDealButton({
  deal,
  className,
  children,
  referrer,
}: {
  deal: Deal;
  className?: string;
  children?: React.ReactNode;
  referrer?: string;
}) {
  const url = chooseUrl(deal);
  if (!url) {
    return (
      <span className={`${className ?? ""} cursor-not-allowed opacity-60`} title="No outbound URL configured">
        {children ?? "View Deal"}
      </span>
    );
  }
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
