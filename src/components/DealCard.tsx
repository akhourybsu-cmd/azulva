import { Link } from "@tanstack/react-router";
import { Heart, Plane, Hotel, Utensils, Car, Briefcase, RefreshCw, Plus, ExternalLink, AlertCircle, CheckCircle2, HelpCircle, X } from "lucide-react";
import type { Deal, InclusionState, DealScoreLabel, AllInclusiveConfidence } from "@/lib/types";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { mockResorts } from "@/lib/data/mockResorts";
import { storeActions, useStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";

function scoreColor(label: DealScoreLabel): string {
  switch (label) {
    case "Excellent Deal": return "bg-[var(--success)] text-success-foreground";
    case "Strong Deal": return "bg-emerald-500 text-white";
    case "Good Deal": return "bg-[var(--ocean)] text-primary-foreground";
    case "Fair Deal": return "bg-[var(--warning)] text-warning-foreground";
    case "Watch Only": return "bg-muted text-muted-foreground";
  }
}

function inclusionIcon(state: InclusionState) {
  if (state === "included") return <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />;
  if (state === "not_included") return <X className="h-3.5 w-3.5 text-destructive" />;
  if (state === "warning") return <AlertCircle className="h-3.5 w-3.5 text-[var(--warning)]" />;
  return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />;
}

function ConfidenceBadge({ c }: { c: AllInclusiveConfidence }) {
  const map: Record<AllInclusiveConfidence, { cls: string; label: string }> = {
    Confirmed: { cls: "bg-[var(--success)]/15 text-[var(--success)]", label: "AI Confirmed" },
    Likely: { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", label: "AI Likely" },
    Unclear: { cls: "bg-[var(--warning)]/20 text-[var(--warning)]", label: "AI Unclear" },
    "Not Included": { cls: "bg-destructive/15 text-destructive", label: "Not All-Inclusive" },
    Unknown: { cls: "bg-muted text-muted-foreground", label: "AI Unknown" },
  };
  const m = map[c];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}>{m.label}</span>;
}

export function DealCard({ deal, compact }: { deal: Deal; compact?: boolean }) {
  const dest = mockDestinations.find((d) => d.id === deal.destinationId);
  const resort = mockResorts.find((r) => r.id === deal.resortId);
  const s = useStore();
  const saved = s.savedDealIds.includes(deal.id);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-lg">
      <Link to="/deals/$dealId" params={{ dealId: deal.id }} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <img
            src={resort?.imageUrl ?? dest?.imageUrl}
            alt={deal.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold shadow ${scoreColor(deal.dealScoreLabel)}`}>
              {deal.dealScore} · {deal.dealScoreLabel}
            </span>
            <button
              onClick={(e) => { e.preventDefault(); storeActions.toggleSaved(deal.id); }}
              className="grid h-9 w-9 place-items-center rounded-full bg-background/85 backdrop-blur transition-colors hover:bg-background"
              aria-label={saved ? "Unsave" : "Save"}
            >
              <Heart className={`h-4 w-4 ${saved ? "fill-[var(--coral)] text-[var(--coral)]" : "text-foreground"}`} />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
            <div className="text-xs opacity-90">{dest?.name}, {dest?.country}</div>
            <div className="font-semibold leading-tight">{resort?.name}</div>
          </div>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">
              {deal.departureAirport} · {deal.nights} nights · {new Date(deal.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
            </div>
            <div className="mt-0.5 line-clamp-2 text-sm font-medium">{deal.title}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold tabular-nums">${deal.pricePerPerson}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">per person</div>
          </div>
        </div>

        {!compact && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ConfidenceBadge c={deal.allInclusiveConfidence} />
              {deal.adultsOnly && <span className="rounded-full bg-[var(--coral)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--coral)]">Adults-only</span>}
              {deal.familyFriendly && <span className="rounded-full bg-[var(--ocean)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--ocean)]">Family-friendly</span>}
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{deal.sourceLabel}</span>
            </div>

            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1" title="Flight">{inclusionIcon(deal.flightIncluded)}<Plane className="h-3.5 w-3.5" /></span>
              <span className="inline-flex items-center gap-1" title="Hotel">{inclusionIcon(deal.hotelIncluded)}<Hotel className="h-3.5 w-3.5" /></span>
              <span className="inline-flex items-center gap-1" title="Food & drinks">{inclusionIcon(deal.foodAndDrinksIncluded)}<Utensils className="h-3.5 w-3.5" /></span>
              <span className="inline-flex items-center gap-1" title="Transfers">{inclusionIcon(deal.transfersIncluded)}<Car className="h-3.5 w-3.5" /></span>
              <span className="inline-flex items-center gap-1" title="Bags">{inclusionIcon(deal.checkedBagsIncluded)}<Briefcase className="h-3.5 w-3.5" /></span>
              <span className="inline-flex items-center gap-1" title="Refundable">{inclusionIcon(deal.refundable)}<RefreshCw className="h-3.5 w-3.5" /></span>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span suppressHydrationWarning>Last checked {formatDistanceToNow(new Date(deal.lastCheckedAt), { addSuffix: true })}</span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Link
                to="/deals/$dealId" params={{ dealId: deal.id }}
                className="flex-1 rounded-lg bg-foreground py-2 text-center text-sm font-semibold text-background"
              >
                View Details
              </Link>
              <a
                href={deal.affiliateUrl ?? deal.sourceUrl}
                target="_blank" rel="noopener noreferrer"
                onClick={() => storeActions.recordOutboundClick({
                  id: crypto.randomUUID(), dealId: deal.id,
                  outboundUrl: deal.affiliateUrl ?? deal.sourceUrl,
                  clickedAt: new Date().toISOString(),
                })}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                Book <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AddToTripButton({ dealId }: { dealId: string }) {
  const s = useStore();
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4" /> Add to a Trip Room</div>
      <div className="space-y-2">
        {s.tripRooms.map((t) => {
          const added = t.dealIds.includes(dealId);
          return (
            <button
              key={t.id}
              disabled={added}
              onClick={() => storeActions.addDealToTripRoom(t.id, dealId)}
              className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
            >
              <span>{t.name}</span>
              <span className="text-xs text-muted-foreground">{added ? "Added" : "Add"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
