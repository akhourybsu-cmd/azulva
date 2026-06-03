import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AddToTripButton, DealCard } from "@/components/DealCard";
import { useAllDeals } from "@/lib/store";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { mockResorts } from "@/lib/data/mockResorts";
import { mockPriceHistoryForDeal } from "@/lib/data/mockDeals";
import { storeActions } from "@/lib/store";
import { Flag, Plane, Hotel, Utensils, Car, Briefcase, RefreshCw, Calendar, MapPin, AlertTriangle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DealDestinationContextCard } from "@/components/DestinationIntelligence";
import { DealTrustPills } from "@/components/DealTrustPills";
import { ViewDealButton } from "@/components/ViewDealButton";
import { loadSnapshotsForDeal, type PriceSnapshotRow } from "@/lib/admin/priceSnapshots";
import { freshnessOf, freshnessLabel } from "@/lib/dealFreshness";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/deals/$dealId")({
  component: DealDetailPage,
});

function DealDetailPage() {
  const { dealId } = Route.useParams();
  const deals = useAllDeals();
  const deal = deals.find((d) => d.id === dealId);
  if (!deal) throw notFound();

  const dest = mockDestinations.find((d) => d.id === deal.destinationId)!;
  const resort = mockResorts.find((r) => r.id === deal.resortId)!;
  const fallbackHistory = useMemo(() => mockPriceHistoryForDeal(deal.id), [deal.id]);
  const [snapshots, setSnapshots] = useState<PriceSnapshotRow[]>([]);
  useEffect(() => {
    loadSnapshotsForDeal(deal.id).then(setSnapshots).catch(() => {});
  }, [deal.id]);
  const history = snapshots.length >= 2
    ? snapshots.map((s) => ({ capturedAt: s.captured_at, pricePerPerson: Number(s.price_per_person) }))
    : fallbackHistory;
  const freshness = freshnessOf(deal);


  const similar = deals.filter((d) => d.destinationId === deal.destinationId && d.id !== deal.id).slice(0, 3);

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="relative h-72 overflow-hidden rounded-3xl md:h-96">
            <img src={resort.imageUrl} alt={resort.name} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">
                <MapPin className="h-3.5 w-3.5" /> {dest.name}, {dest.country}
              </div>
              <h1 className="font-display text-3xl md:text-4xl">{resort.name}</h1>
              <div className="mt-1 text-sm opacity-90">{deal.title}</div>
            </div>
          </div>

          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Azulva Score · {deal.dealScore}</h2>
              <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">{deal.dealScoreLabel}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{deal.dealScoreExplanation}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {([
                ["Price value", deal.priceValueScore],
                ["Resort quality", deal.resortQualityScore],
                ["Flight convenience", deal.flightConvenienceScore],
                ["All-inclusive confidence", deal.allInclusiveConfidenceScore],
                ["Group fit", deal.groupFitScore],
                ["Flexibility", deal.flexibilityScore],
                ["Urgency", deal.urgencyScore],
              ] as const).map(([label, v]) => (
                <div key={label} className="rounded-xl bg-muted/40 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                  <div className="font-display text-2xl">{v}</div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[var(--ocean)]" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">What's included</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              <InclusionRow icon={<Plane className="h-4 w-4" />} label="Flight" state={deal.flightIncluded} />
              <InclusionRow icon={<Hotel className="h-4 w-4" />} label="Resort (all-inclusive)" state={deal.hotelIncluded} />
              <InclusionRow icon={<Utensils className="h-4 w-4" />} label="Food & drinks" state={deal.foodAndDrinksIncluded} />
              <InclusionRow icon={<Car className="h-4 w-4" />} label="Airport transfers" state={deal.transfersIncluded} />
              <InclusionRow icon={<Briefcase className="h-4 w-4" />} label="Checked bags" state={deal.checkedBagsIncluded} />
              <InclusionRow icon={<RefreshCw className="h-4 w-4" />} label="Refundable" state={deal.refundable} />
            </ul>
            {deal.allInclusiveConfidence !== "Confirmed" && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-3 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning)]" />
                <div>All-inclusive status is <strong>{deal.allInclusiveConfidence}</strong>. Verify exactly what's included with the booking partner before purchase.</div>
              </div>
            )}
            <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <strong>Room:</strong> {deal.roomType} · <strong>Meal plan:</strong> {deal.mealPlan}<br />
              <strong>Cancellation:</strong> {deal.cancellationNotes}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">AI summary</h2>
            <p className="mt-2 text-sm leading-relaxed">{deal.aiSummary}</p>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">Price history</h2>
            {history.length < 3 ? (
              <p className="mt-2 text-sm text-muted-foreground">Not enough price history yet. Save this deal to start tracking.</p>
            ) : <PriceChart points={history} current={deal.pricePerPerson} />}
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">About {resort.name}</h2>
            <p className="mt-2 text-sm">{resort.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {resort.amenities.map((a) => <span key={a} className="rounded-full bg-muted px-2.5 py-1 text-xs">{a}</span>)}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {resort.starRating}★ · Guest rating {resort.guestRating}/10 · {resort.reviewCount.toLocaleString()} reviews
            </div>
          </section>

          {similar.length > 0 && (
            <section className="mt-6">
              <h2 className="font-display text-xl mb-3">Similar deals in {dest.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {similar.map((d) => <DealCard key={d.id} deal={d} compact />)}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Price per person</div>
            <div className="font-display text-4xl">${deal.pricePerPerson}</div>
            <div className="text-xs text-muted-foreground">Est. total for 2: ${deal.totalPriceEstimate}</div>
            <div className="mt-4 space-y-2 text-sm">
              <Row icon={<Calendar className="h-4 w-4" />} v={`${new Date(deal.startDate).toLocaleDateString()} → ${new Date(deal.endDate).toLocaleDateString()} (${deal.nights}n)`} />
              <Row icon={<Plane className="h-4 w-4" />} v={`From ${deal.departureAirport}`} />
              <Row icon={<Flag className="h-4 w-4" />} v={`Source: ${deal.sourceLabel}`} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5"><DealTrustPills deal={deal} /></div>
            <ViewDealButton
              deal={deal}
              referrer={`/deals/${deal.id}`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--ocean)] to-[var(--coral)] py-3 text-sm font-semibold text-primary-foreground shadow"
            >
              Continue to booking partner
            </ViewDealButton>
            <p className="mt-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="mr-1 inline h-3 w-3" />
              Last checked <span suppressHydrationWarning>{formatDistanceToNow(new Date(deal.lastCheckedAt), { addSuffix: true })}</span>
              {" · "}{freshnessLabel(freshness)}.
              Prices and inclusions should be verified with the booking provider before purchase.
            </p>
            <button
              onClick={() => storeActions.toggleSaved(deal.id)}
              className="mt-2 w-full rounded-xl border border-border py-2 text-sm hover:bg-muted"
            >
              Save to watchlist
            </button>
          </div>


          <AddToTripButton dealId={deal.id} />

          <DealDestinationContextCard
            input={{
              destinationId: dest.id,
              latitude: dest.latitude,
              longitude: dest.longitude,
              countryCode: dest.countryCode,
              currencyCode: dest.currencyCode,
            }}
            destName={dest.name}
            bestMonths={dest.bestMonths}
            rainyMonths={dest.rainyMonths}
          />

          <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            <Link to="/explore/$slug" params={{ slug: dest.slug }} className="font-semibold text-foreground hover:underline">
              See more in {dest.name} →
            </Link>
            <div className="mt-1">Weather, currency, and country basics on the destination page.</div>
          </div>

          <button className="w-full rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground hover:bg-muted">
            🚩 Report inaccurate deal
          </button>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ icon, v }: { icon: React.ReactNode; v: string }) {
  return <div className="flex items-center gap-2 text-muted-foreground">{icon}<span>{v}</span></div>;
}

function InclusionRow({ icon, label, state }: { icon: React.ReactNode; label: string; state: string }) {
  const color = state === "included" ? "text-[var(--success)]"
    : state === "not_included" ? "text-destructive"
    : state === "warning" ? "text-[var(--warning)]" : "text-muted-foreground";
  const text = state === "included" ? "Included" : state === "not_included" ? "Not included" : state === "warning" ? "Warning" : "Unknown — verify";
  return (
    <li className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
      <span className="flex items-center gap-2 text-sm">{icon}{label}</span>
      <span className={`text-xs font-semibold ${color}`}>{text}</span>
    </li>
  );
}

function PriceChart({ points, current }: { points: { capturedAt: string; pricePerPerson: number }[]; current: number }) {
  const w = 600, h = 160, pad = 16;
  const xs = points.map((p) => +new Date(p.capturedAt));
  const ys = points.map((p) => p.pricePerPerson);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys, current) - 50, maxY = Math.max(...ys, current) + 50;
  const X = (x: number) => pad + ((x - minX) / (maxX - minX)) * (w - pad * 2);
  const Y = (y: number) => h - pad - ((y - minY) / (maxY - minY)) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${X(+new Date(p.capturedAt)).toFixed(1)},${Y(p.pricePerPerson).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full">
      <path d={path} fill="none" stroke="var(--ocean)" strokeWidth="2.5" />
      <line x1={pad} x2={w - pad} y1={Y(current)} y2={Y(current)} stroke="var(--coral)" strokeDasharray="4 4" strokeWidth="1.5" />
      <text x={w - pad} y={Y(current) - 4} textAnchor="end" fontSize="10" fill="var(--coral)">Now ${current}</text>
    </svg>
  );
}
