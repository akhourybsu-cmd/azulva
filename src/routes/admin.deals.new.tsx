import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { storeActions } from "@/lib/store";
import { mockResorts } from "@/lib/data/mockResorts";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { calculateDealScore } from "@/lib/scoring/DealScoringService";
import { useEffect, useState } from "react";
import type { Deal, AllInclusiveConfidence, InclusionState } from "@/lib/types";
import { loadDealSources, type DealSourceRow } from "@/lib/admin/dealSources";
import { tryGenerateAffiliateLink } from "@/lib/affiliates/AffiliateLinkService";

export const Route = createFileRoute("/admin/deals/new")({
  component: () => <AdminGuard><NewDealPage /></AdminGuard>,
});

const incOpts: InclusionState[] = ["included", "not_included", "warning", "unknown"];

function NewDealPage() {
  const nav = useNavigate();
  const [sources, setSources] = useState<DealSourceRow[]>([]);
  useEffect(() => { loadDealSources().then(setSources); }, []);

  const [resortId, setResortId] = useState(mockResorts[0].id);
  const [title, setTitle] = useState("");
  const [airport, setAirport] = useState("BOS");
  const [arrival, setArrival] = useState("PUJ");
  const [nights, setNights] = useState(5);
  const [price, setPrice] = useState(1199);
  const [benchmark, setBenchmark] = useState(1500);
  const [daysOut, setDaysOut] = useState(45);
  const [sourceId, setSourceId] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [generatedAffiliateUrl, setGeneratedAffiliateUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [flight, setFlight] = useState<InclusionState>("included");
  const [transfers, setTransfers] = useState<InclusionState>("included");
  const [bags, setBags] = useState<InclusionState>("unknown");
  const [refundable, setRefundable] = useState<InclusionState>("unknown");
  const [roomType, setRoomType] = useState("Standard");
  const [mealPlan, setMealPlan] = useState("All-Inclusive");
  const [adultsOnly, setAdultsOnly] = useState(false);
  const [familyFriendly, setFamilyFriendly] = useState(true);
  const [confidence, setConfidence] = useState<AllInclusiveConfidence>("Likely");
  const [expiresAt, setExpiresAt] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [status, setStatus] = useState<Deal["status"]>("active");
  const [cancellationNotes, setCancellationNotes] = useState("Refundable up to 14 days before travel.");

  async function generateAffiliate() {
    if (!sourceUrl) return;
    setGenerating(true);
    const res = await tryGenerateAffiliateLink(sourceUrl);
    setGenerating(false);
    if (res.affiliateUrl) {
      setGeneratedAffiliateUrl(res.affiliateUrl);
    } else {
      alert(
        res.reason === "no_token"
          ? "No TRAVELPAYOUTS_TOKEN configured. Add an affiliate URL manually."
          : "Could not generate affiliate URL. Use a manual one.",
      );
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const resort = mockResorts.find((r) => r.id === resortId)!;
    const dest = mockDestinations.find((d) => d.id === resort.destinationId)!;
    const start = new Date(); start.setDate(start.getDate() + daysOut);
    const end = new Date(start); end.setDate(end.getDate() + nights);
    const score = calculateDealScore({
      pricePerPerson: price, benchmarkPrice: benchmark,
      resortGuestRating: resort.guestRating, resortStarRating: resort.starRating,
      nights, flightIncluded: flight === "included", nonstopLikely: true,
      allInclusiveConfidence: confidence,
      refundable: refundable === "included", daysUntilDeparture: daysOut,
    });
    const finalTitle = title || `${resort.name} — ${nights} nights all-inclusive`;
    const deal: Deal = {
      id: "custom-" + crypto.randomUUID().slice(0, 8),
      title: finalTitle,
      resortId, destinationId: dest.id,
      sourceLabel: "Curated Deal",
      sourceId: sourceId || null,
      sourceUrl: sourceUrl || "",
      affiliateUrl: affiliateUrl || undefined,
      generatedAffiliateUrl: generatedAffiliateUrl || undefined,
      departureAirport: airport, arrivalAirport: arrival,
      startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10),
      nights, pricePerPerson: price, totalPriceEstimate: price * 2, currencyCode: "USD",
      flightIncluded: flight, transfersIncluded: transfers, checkedBagsIncluded: bags,
      foodAndDrinksIncluded: "included", hotelIncluded: "included", refundable,
      roomType, mealPlan,
      adultsOnly, familyFriendly,
      cancellationNotes,
      allInclusiveConfidence: confidence,
      status, lastCheckedAt: new Date().toISOString(),
      expiresAt: expiresAt || undefined,
      adminNotes: adminNotes || undefined,
      sourceConfidence: "medium",
      aiSummary: "Manually curated deal. Verify all details with the booking partner.",
      ...score,
    };
    storeActions.addCustomDeal(deal);
    nav({ to: "/admin" });
  }

  function inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />;
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl mb-4">New curated deal</h1>
      <form onSubmit={submit} className="grid max-w-3xl gap-4 rounded-2xl border border-border bg-card p-5 text-sm">
        <label>Title (optional)
          {inp({ value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Auto-generated from resort if blank" })}
        </label>
        <label>Resort
          <select value={resortId} onChange={(e) => setResortId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2">
            {mockResorts.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>

        <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label>Airport{inp({ value: airport, onChange: (e) => setAirport(e.target.value.toUpperCase()) })}</label>
          <label>Arrival{inp({ value: arrival, onChange: (e) => setArrival(e.target.value.toUpperCase()) })}</label>
          <label>Nights{inp({ type: "number", value: nights, onChange: (e) => setNights(+e.target.value) })}</label>
          <label>Days out{inp({ type: "number", value: daysOut, onChange: (e) => setDaysOut(+e.target.value) })}</label>
          <label>Price/pp{inp({ type: "number", value: price, onChange: (e) => setPrice(+e.target.value) })}</label>
          <label>Benchmark{inp({ type: "number", value: benchmark, onChange: (e) => setBenchmark(+e.target.value) })}</label>
          <label>Expires at{inp({ type: "date", value: expiresAt, onChange: (e) => setExpiresAt(e.target.value) })}</label>
          <label>Status
            <select value={status} onChange={(e) => setStatus(e.target.value as Deal["status"])} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2">
              <option value="active">active</option><option value="draft">draft</option>
              <option value="expiring">expiring</option><option value="expired">expired</option><option value="flagged">flagged</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <label>Source
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2">
              <option value="">— None —</option>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>All-inclusive confidence
            <select value={confidence} onChange={(e) => setConfidence(e.target.value as AllInclusiveConfidence)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2">
              <option>Confirmed</option><option>Likely</option><option>Unclear</option><option>Not Included</option><option>Unknown</option>
            </select>
          </label>
          <label className="sm:col-span-2">Source URL{inp({ value: sourceUrl, onChange: (e) => setSourceUrl(e.target.value), type: "url", placeholder: "https://..." })}</label>
          <label className="sm:col-span-2">Affiliate URL (manual){inp({ value: affiliateUrl, onChange: (e) => setAffiliateUrl(e.target.value), type: "url", placeholder: "https://... (optional)" })}</label>
          <div className="sm:col-span-2 flex items-center gap-2">
            <button type="button" onClick={generateAffiliate} disabled={!sourceUrl || generating} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-60">
              {generating ? "Generating…" : "Generate affiliate URL (Travelpayouts)"}
            </button>
            {generatedAffiliateUrl && <span className="truncate text-xs text-muted-foreground">→ {generatedAffiliateUrl}</span>}
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ["Flight", flight, setFlight],
            ["Transfers", transfers, setTransfers],
            ["Bags", bags, setBags],
            ["Refundable", refundable, setRefundable],
          ] as const).map(([label, val, setter]) => (
            <label key={label}>{label}
              <select value={val} onChange={(e) => setter(e.target.value as InclusionState)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2">
                {incOpts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          ))}
        </fieldset>

        <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label>Room type{inp({ value: roomType, onChange: (e) => setRoomType(e.target.value) })}</label>
          <label>Meal plan{inp({ value: mealPlan, onChange: (e) => setMealPlan(e.target.value) })}</label>
          <label className="inline-flex items-center gap-2 self-end"><input type="checkbox" checked={adultsOnly} onChange={(e) => setAdultsOnly(e.target.checked)} /> Adults-only</label>
          <label className="inline-flex items-center gap-2 self-end"><input type="checkbox" checked={familyFriendly} onChange={(e) => setFamilyFriendly(e.target.checked)} /> Family-friendly</label>
        </fieldset>

        <label>Cancellation notes{inp({ value: cancellationNotes, onChange: (e) => setCancellationNotes(e.target.value) })}</label>
        <label>Admin notes{inp({ value: adminNotes, onChange: (e) => setAdminNotes(e.target.value) })}</label>

        <button className="mt-2 rounded-lg bg-foreground py-2.5 font-semibold text-background">Create deal</button>
      </form>
    </AppShell>
  );
}
