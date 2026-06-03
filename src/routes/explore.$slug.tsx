import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DealCard } from "@/components/DealCard";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { mockResorts } from "@/lib/data/mockResorts";
import { useAllDeals } from "@/lib/store";
import { CloudRain, Sun, Globe2, Coins, Languages } from "lucide-react";

export const Route = createFileRoute("/explore/$slug")({
  component: DestinationDetail,
});

const monthName = (m: number) => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1];

function DestinationDetail() {
  const { slug } = Route.useParams();
  const dest = mockDestinations.find((d) => d.slug === slug);
  if (!dest) throw notFound();

  const deals = useAllDeals().filter((d) => d.destinationId === dest.id);
  const resorts = mockResorts.filter((r) => r.destinationId === dest.id);
  const minPrice = deals.length ? Math.min(...deals.map((d) => d.pricePerPerson)) : 0;

  return (
    <AppShell>
      <div className="relative h-72 overflow-hidden rounded-3xl md:h-96">
        <img src={dest.imageUrl} alt={dest.name} className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
          <div className="text-sm uppercase tracking-widest opacity-80">{dest.region}</div>
          <h1 className="font-display text-4xl md:text-5xl">{dest.name}</h1>
          <div className="text-sm opacity-90">{dest.country} · {dest.countryCode}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <p className="text-lg leading-relaxed">{dest.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {dest.vibeTags.map((t) => (
              <span key={t} className="rounded-full bg-[var(--ocean)]/10 px-3 py-1 text-xs font-semibold text-[var(--ocean)]">{t}</span>
            ))}
          </div>

          <section className="mt-8">
            <h2 className="font-display text-2xl mb-3">Current deals · {deals.length}</h2>
            {deals.length === 0 ? (
              <p className="text-muted-foreground">No deals tracked yet for this destination.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {deals.map((d) => <DealCard key={d.id} deal={d} />)}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="font-display text-2xl mb-3">Watched resorts · {resorts.length}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {resorts.map((r) => (
                <div key={r.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                  <img src={r.imageUrl} alt="" className="h-20 w-28 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.starRating}★ · {r.guestRating}/10 · {r.reviewCount.toLocaleString()} reviews</div>
                    <div className="mt-1 flex gap-1.5">
                      {r.adultsOnly && <span className="rounded-full bg-[var(--coral)]/15 px-2 py-0.5 text-[10px] text-[var(--coral)]">Adults-only</span>}
                      {r.familyFriendly && <span className="rounded-full bg-[var(--ocean)]/15 px-2 py-0.5 text-[10px] text-[var(--ocean)]">Family</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Starting from</div>
            <div className="font-display text-3xl">${minPrice || "—"}/pp</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-display text-lg">Best months to visit</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const best = dest.bestMonths.includes(m);
                const rainy = dest.rainyMonths.includes(m);
                return (
                  <span key={m} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${best ? "bg-[var(--success)]/15 text-[var(--success)]" : rainy ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-muted text-muted-foreground"}`}>
                    {best ? <Sun className="h-3 w-3" /> : rainy ? <CloudRain className="h-3 w-3" /> : null}
                    {monthName(m)}
                  </span>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">Weather data will come from Open-Meteo once configured.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-display text-lg">Country info</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-muted-foreground" /> {dest.country} ({dest.countryCode})</li>
              <li className="flex items-center gap-2"><Coins className="h-4 w-4 text-muted-foreground" /> {dest.currencyCode}</li>
              <li className="flex items-center gap-2"><Languages className="h-4 w-4 text-muted-foreground" /> {dest.languageCodes.join(", ")}</li>
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">Country metadata, flags, and currency conversion will be powered by REST Countries + Frankfurter.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 font-display text-lg">Things to do</h3>
            <p className="text-sm text-muted-foreground">Attractions and points of interest will be populated by OpenTripMap when configured.</p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
