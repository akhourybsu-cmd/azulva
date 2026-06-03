import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DealCard } from "@/components/DealCard";
import { useAllDeals } from "@/lib/store";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { Search, SlidersHorizontal, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today's Best Escapes — Azulva" },
      { name: "description", content: "Hand-curated, Azulva-scored all-inclusive vacation deals — updated daily." },
    ],
  }),
  component: HomePage,
});

const SORTS = ["Best Azulva Score", "Lowest Price", "Highest Resort Rating", "Newest", "Expiring Soon"] as const;
type Sort = typeof SORTS[number];

function HomePage() {
  const deals = useAllDeals();
  const [airport, setAirport] = useState<string>("Any");
  const [destination, setDestination] = useState<string>("Any");
  const [maxPrice, setMaxPrice] = useState<number>(3000);
  const [audience, setAudience] = useState<"any" | "adults" | "family">("any");
  const [minScore, setMinScore] = useState<number>(0);
  const [sort, setSort] = useState<Sort>("Best Azulva Score");
  const [q, setQ] = useState("");

  const airports = useMemo(() => ["Any", ...Array.from(new Set(deals.map((d) => d.departureAirport)))], [deals]);

  const filtered = useMemo(() => {
    let out = deals.filter((d) => {
      if (airport !== "Any" && d.departureAirport !== airport) return false;
      if (destination !== "Any" && d.destinationId !== destination) return false;
      if (d.pricePerPerson > maxPrice) return false;
      if (audience === "adults" && !d.adultsOnly) return false;
      if (audience === "family" && !d.familyFriendly) return false;
      if (d.dealScore < minScore) return false;
      if (q && !d.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    switch (sort) {
      case "Lowest Price": out.sort((a, b) => a.pricePerPerson - b.pricePerPerson); break;
      case "Highest Resort Rating": out.sort((a, b) => b.resortQualityScore - a.resortQualityScore); break;
      case "Newest": out.sort((a, b) => +new Date(b.lastCheckedAt) - +new Date(a.lastCheckedAt)); break;
      case "Expiring Soon": out.sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate)); break;
      default: out.sort((a, b) => b.dealScore - a.dealScore);
    }
    return out;
  }, [deals, airport, destination, maxPrice, audience, minScore, sort, q]);

  const top = filtered[0];

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[var(--ocean)]/90 via-[var(--ocean)] to-[var(--coral)] p-6 text-primary-foreground shadow-lg md:p-10">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <TrendingUp className="h-3.5 w-3.5" /> {filtered.length} live deals · scored & ranked
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-5xl">
            Find the all-inclusive trip everyone actually agrees on.
          </h1>
          <p className="mt-2 text-sm text-white/90 md:text-base">
            Track resort deals, compare trip options, vote with friends, and know when a beach escape is actually worth booking.
          </p>
          <div className="mt-5 flex max-w-md items-center gap-2 rounded-full bg-white/95 p-1.5 text-foreground shadow-lg">
            <Search className="ml-3 h-4 w-4 text-muted-foreground" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search resorts, destinations…"
              className="flex-1 bg-transparent py-2 text-sm outline-none"
            />
          </div>
        </div>
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 right-12 h-72 w-72 rounded-full bg-[var(--sunset)]/30 blur-3xl" />
      </section>

      {/* Filter bar */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </div>
        <div className="grid gap-3 md:grid-cols-6">
          <Select label="From airport" value={airport} onChange={setAirport} options={airports} />
          <Select label="Destination" value={destination} onChange={setDestination}
            options={["Any", ...mockDestinations.map((d) => d.id)]}
            renderOption={(v) => v === "Any" ? "Any" : mockDestinations.find((d) => d.id === v)?.name ?? v}
          />
          <Select label="Audience" value={audience} onChange={(v) => setAudience(v as typeof audience)}
            options={["any", "adults", "family"]}
            renderOption={(v) => v === "any" ? "Any" : v === "adults" ? "Adults-only" : "Family"}
          />
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">Max ${maxPrice}/pp</label>
            <input type="range" min={500} max={3500} step={50} value={maxPrice}
              onChange={(e) => setMaxPrice(+e.target.value)} className="w-full accent-[var(--ocean)]" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">Min score {minScore}</label>
            <input type="range" min={0} max={95} step={5} value={minScore}
              onChange={(e) => setMinScore(+e.target.value)} className="w-full accent-[var(--ocean)]" />
          </div>
          <Select label="Sort" value={sort} onChange={(v) => setSort(v as Sort)} options={[...SORTS]} />
        </div>
      </section>

      {/* Today's Best Escape */}
      {top && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl">Today's Best Escape</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-1"><DealCard deal={top} /></div>
            <div className="rounded-2xl border border-border bg-card p-5 text-sm lg:col-span-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Why we picked this</div>
              <p className="mt-1 text-base leading-relaxed">{top.aiSummary}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs md:grid-cols-6">
                <Metric label="Price value" v={top.priceValueScore} />
                <Metric label="Resort" v={top.resortQualityScore} />
                <Metric label="Flight" v={top.flightConvenienceScore} />
                <Metric label="AI conf." v={top.allInclusiveConfidenceScore} />
                <Metric label="Flex" v={top.flexibilityScore} />
                <Metric label="Urgency" v={top.urgencyScore} />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 font-display text-xl">Today's Best Escapes · {filtered.length}</h2>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No deals match these filters. Loosen up?
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => <DealCard key={d.id} deal={d} />)}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Select<T extends string>({ label, value, onChange, options, renderOption }: {
  label: string; value: T; onChange: (v: T) => void; options: readonly T[]; renderOption?: (v: T) => string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm">
        {options.map((o) => <option key={o} value={o}>{renderOption ? renderOption(o) : o}</option>)}
      </select>
    </div>
  );
}

function Metric({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold">{v}</div>
    </div>
  );
}
