import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DealCard } from "@/components/DealCard";
import { useAllDeals, useStore, storeActions } from "@/lib/store";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { Bookmark, Heart, Plane, Bell, ScanSearch, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CompareDestinationsDialog, useCompareSet } from "@/components/CompareDestinations";
import { SuggestToTripRoomButton } from "@/components/SuggestToTripRoom";

export const Route = createFileRoute("/escape-board")({
  head: () => ({
    meta: [
      { title: "Your Escape Board — Azulva" },
      { name: "description", content: "Saved destinations and saved deals, side by side. Compare weather, currency, and deal strength." },
    ],
  }),
  component: EscapeBoardPage,
});

const monthName = (m: number) => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1];

function EscapeBoardPage() {
  const s = useStore();
  const allDeals = useAllDeals();
  const savedDeals = allDeals.filter((d) => s.savedDealIds.includes(d.id));
  const savedDests = useMemo(
    () => mockDestinations.filter((d) => s.savedDestinationIds.includes(d.id)),
    [s.savedDestinationIds]
  );
  const compare = useCompareSet(4);
  const [compareOpen, setCompareOpen] = useState(false);
  const compareDests = savedDests.filter((d) => compare.has(d.id));

  const dealCountsByDest = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of allDeals) m.set(d.destinationId, (m.get(d.destinationId) ?? 0) + 1);
    return m;
  }, [allDeals]);

  const empty = savedDests.length === 0 && savedDeals.length === 0;

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl">Your Escape Board</h1>
        <p className="mt-1 text-muted-foreground">
          Where you're considering going and the deals you're watching — all in one place.
        </p>
      </header>

      {empty && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-xl">Your next trip starts here</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Save a destination or deal to begin comparing escapes.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link to="/explore" className="rounded-full bg-foreground px-4 py-2 text-sm text-background">Browse destinations</Link>
            <Link to="/" className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-muted">See today's deals</Link>
          </div>
        </div>
      )}

      {/* Saved destinations */}
      {savedDests.length > 0 && (
        <section className="mt-2">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <Bookmark className="h-5 w-5" /> Saved destinations · {savedDests.length}
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {compare.ids.length}/{compare.max} picked for compare
              </span>
              <button
                onClick={() => setCompareOpen(true)}
                disabled={compare.ids.length < 2}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-50"
              >
                <ScanSearch className="h-3.5 w-3.5" /> Compare
              </button>
              {compare.ids.length > 0 && (
                <button onClick={compare.clear} className="text-xs text-muted-foreground underline">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedDests.map((d) => {
              const picked = compare.has(d.id);
              const count = dealCountsByDest.get(d.id) ?? 0;
              return (
                <div key={d.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img src={d.imageUrl} alt={d.name} loading="lazy" className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 text-white">
                      <div className="font-display text-xl">{d.name}</div>
                      <div className="text-[11px] opacity-80">{d.country}</div>
                    </div>
                    {count > 0 && (
                      <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                        {count} deal{count > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {d.vibeTags.slice(0, 4).map((t) => (
                        <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{t}</span>
                      ))}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Best: {d.bestMonths.slice(0, 4).map(monthName).join(", ")}
                      {d.rainyMonths.length > 0 && (
                        <> · <span className="text-[var(--warning)]">rainy {d.rainyMonths.map(monthName).join(", ")}</span></>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/explore/$slug" params={{ slug: d.slug }}
                        className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                      >
                        View destination
                      </Link>
                      <a
                        href={`/watchlist?destination=${d.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
                      >
                        <Bell className="h-3.5 w-3.5" /> Create Deal Watch
                      </a>
                      <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={picked}
                          onChange={() => compare.toggle(d.id)}
                          className="h-3.5 w-3.5 accent-[var(--ocean)]"
                        />
                        Compare
                      </label>
                      <button
                        onClick={() => storeActions.toggleSavedDestination(d.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label="Remove from Escape Board"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Destination intelligence (weather, currency) is planning context. Always verify with the booking provider.
          </p>
        </section>
      )}

      {savedDests.length === 0 && savedDeals.length > 0 && (
        <section className="mt-2 rounded-2xl border border-dashed border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <Plane className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-semibold">Start building your escape board.</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Save destinations you're considering, compare them, and create Deal Watches when you're ready.
              </p>
              <Link to="/explore" className="mt-3 inline-block rounded-full bg-foreground px-4 py-2 text-sm text-background">
                Browse destinations
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Saved deals */}
      {savedDeals.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl">
            <Heart className="h-5 w-5" /> Saved deals · {savedDeals.length}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {savedDeals.map((d) => <DealCard key={d.id} deal={d} />)}
          </div>
        </section>
      )}

      <CompareDestinationsDialog
        destinations={compareDests}
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
      />
    </AppShell>
  );
}
