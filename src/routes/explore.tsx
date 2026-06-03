import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { useAllDeals } from "@/lib/store";
import { useMemo } from "react";
import { CloudRain, Plane, ShieldCheck } from "lucide-react";
import { SaveDestinationButton } from "@/components/SaveDestinationButton";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Explore Escapes — Azulva" }] }),
  component: ExplorePage,
});

const monthName = (m: number) => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1];

function ExplorePage() {
  const deals = useAllDeals();
  const byDest = useMemo(() => {
    const m = new Map<string, { min: number; max: number; count: number }>();
    for (const d of deals) {
      const cur = m.get(d.destinationId) ?? { min: Infinity, max: -Infinity, count: 0 };
      cur.min = Math.min(cur.min, d.pricePerPerson);
      cur.max = Math.max(cur.max, d.pricePerPerson);
      cur.count++;
      m.set(d.destinationId, cur);
    }
    return m;
  }, [deals]);

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl">Explore Escapes</h1>
        <p className="mt-1 text-muted-foreground">Caribbean & Mexico all-inclusive destinations, ranked by current deal activity.</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {mockDestinations.map((d) => {
          const stats = byDest.get(d.id);
          return (
            <Link key={d.id} to="/explore/$slug" params={{ slug: d.slug }}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-lg">
              <div className="relative aspect-[16/9] overflow-hidden">
                <img src={d.imageUrl} alt={d.name} loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 text-white">
                  <div className="font-display text-2xl">{d.name}</div>
                  <div className="text-xs opacity-80">{d.country}</div>
                </div>
                {stats && (
                  <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-foreground">
                    {stats.count} deal{stats.count > 1 ? "s" : ""}
                  </span>
                )}
                <div className="absolute left-3 top-3">
                  <SaveDestinationButton destinationId={d.id} />
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5">
                  {d.vibeTags.slice(0, 4).map((t) => (
                    <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{t}</span>
                  ))}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {stats && <span className="font-semibold text-foreground">${stats.min}–${stats.max}/pp</span>}
                  {d.avgFlightHoursFromBOS && <span className="inline-flex items-center gap-1"><Plane className="h-3 w-3" /> ~{d.avgFlightHoursFromBOS}h from BOS</span>}
                  {d.passportRequiredForUsTravelers && <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Passport</span>}
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>Best: {d.bestMonths.slice(0, 4).map(monthName).join(", ")}</span>
                  {d.rainyMonths.length > 0 && <span className="inline-flex items-center gap-1 text-[var(--warning)]"><CloudRain className="h-3 w-3" /> rainy {d.rainyMonths.map(monthName).join(", ")}</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
