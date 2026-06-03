import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { storeActions } from "@/lib/store";
import { mockResorts } from "@/lib/data/mockResorts";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { calculateDealScore } from "@/lib/scoring/DealScoringService";
import { useState } from "react";
import type { Deal } from "@/lib/types";

export const Route = createFileRoute("/admin/deals/new")({
  component: NewDealPage,
});

function NewDealPage() {
  const nav = useNavigate();
  const [resortId, setResortId] = useState(mockResorts[0].id);
  const [airport, setAirport] = useState("BOS");
  const [nights, setNights] = useState(5);
  const [price, setPrice] = useState(1199);
  const [benchmark, setBenchmark] = useState(1500);
  const [daysOut, setDaysOut] = useState(45);
  const [sourceUrl, setSourceUrl] = useState("https://example.com");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const resort = mockResorts.find((r) => r.id === resortId)!;
    const dest = mockDestinations.find((d) => d.id === resort.destinationId)!;
    const start = new Date(); start.setDate(start.getDate() + daysOut);
    const end = new Date(start); end.setDate(end.getDate() + nights);
    const score = calculateDealScore({
      pricePerPerson: price, benchmarkPrice: benchmark,
      resortGuestRating: resort.guestRating, resortStarRating: resort.starRating,
      nights, flightIncluded: true, nonstopLikely: true,
      allInclusiveConfidence: resort.allInclusiveConfidence as "Confirmed",
      refundable: true, daysUntilDeparture: daysOut,
    });
    const deal: Deal = {
      id: "custom-" + crypto.randomUUID().slice(0, 8),
      title: `${resort.name} — ${nights} nights all-inclusive`,
      resortId, destinationId: dest.id, sourceLabel: "Curated Deal",
      sourceUrl, departureAirport: airport, arrivalAirport: "—",
      startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10),
      nights, pricePerPerson: price, totalPriceEstimate: price * 2, currencyCode: "USD",
      flightIncluded: "included", transfersIncluded: "included", checkedBagsIncluded: "included",
      foodAndDrinksIncluded: "included", hotelIncluded: "included", refundable: "included",
      roomType: "Standard", mealPlan: "All-Inclusive",
      adultsOnly: resort.adultsOnly, familyFriendly: resort.familyFriendly,
      cancellationNotes: "Refundable up to 14 days before travel.",
      allInclusiveConfidence: resort.allInclusiveConfidence,
      status: "active", lastCheckedAt: new Date().toISOString(),
      aiSummary: "Manually curated deal. Verify all details with the booking partner.",
      ...score,
    };
    storeActions.addCustomDeal(deal);
    nav({ to: "/admin" });
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl mb-4">New manual deal</h1>
      <form onSubmit={submit} className="grid max-w-2xl gap-3 rounded-2xl border border-border bg-card p-5">
        <label className="text-sm">Resort
          <select value={resortId} onChange={(e) => setResortId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2">
            {mockResorts.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label>Airport<input value={airport} onChange={(e) => setAirport(e.target.value.toUpperCase())} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <label>Nights<input type="number" value={nights} onChange={(e) => setNights(+e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <label>Price/pp<input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <label>Benchmark<input type="number" value={benchmark} onChange={(e) => setBenchmark(+e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <label>Days out<input type="number" value={daysOut} onChange={(e) => setDaysOut(+e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <label>Source URL<input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        </div>
        <button className="mt-2 rounded-lg bg-foreground py-2.5 font-semibold text-background">Create deal</button>
      </form>
    </AppShell>
  );
}
