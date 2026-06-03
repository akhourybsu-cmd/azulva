import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DealCard } from "@/components/DealCard";
import { ViewDealButton } from "@/components/ViewDealButton";
import { useAllDeals, useStore, storeActions } from "@/lib/store";
import { useEffect, useState } from "react";
import { Bell, Heart, Plus, Trash2, Bookmark, ExternalLink } from "lucide-react";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { useAuth } from "@/hooks/use-auth";
import { loadProfileAndPrefs } from "@/lib/cloudSync";

export const Route = createFileRoute("/watchlist")({
  head: () => ({ meta: [{ title: "Deal Watches — Azulva" }] }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const s = useStore();
  const deals = useAllDeals();
  const saved = deals.filter((d) => s.savedDealIds.includes(d.id));
  const [showNew, setShowNew] = useState(false);
  const [prefillDest, setPrefillDest] = useState<string | null>(null);

  // Read ?destination=ID and auto-open the new-watch form.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const d = sp.get("destination");
    if (d) {
      setPrefillDest(d);
      setShowNew(true);
    }
  }, []);

  return (
    <AppShell>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Deal Watches</h1>
          <p className="text-muted-foreground">Saved deals + searches we'll keep an eye on.</p>
        </div>
        <button onClick={() => setShowNew((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm text-background">
          <Plus className="h-4 w-4" /> New search
        </button>
      </header>

      {showNew && <NewWatchlistForm prefillDest={prefillDest} onDone={() => { setShowNew(false); setPrefillDest(null); }} />}

      <div className="mt-4 rounded-2xl border border-border bg-card p-3 text-sm">
        <Link to="/escape-board" className="inline-flex items-center gap-1.5 font-medium text-[var(--ocean)] hover:underline">
          <Bookmark className="h-4 w-4" /> See your Escape Board → saved destinations &amp; deals
        </Link>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl"><Bell className="h-5 w-5" /> Saved searches</h2>
        {s.watchlists.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No saved searches yet. Create a Deal Watch to get alerts when matching escapes appear.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {s.watchlists.map((w) => {
              const matches = deals.filter((d) =>
                (w.destinations === "Anywhere" || (w.destinations as string[]).includes(d.destinationId))
                && d.pricePerPerson <= w.maxPricePerPerson
                && d.dealScore >= w.minimumDealScore
                && (!w.adultsOnlyRequired || d.adultsOnly)
                && (!w.familyFriendlyRequired || d.familyFriendly)
              );
              return (
                <div key={w.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-muted-foreground">
                        From {w.homeAirport} · ≤${w.maxPricePerPerson}/pp · score ≥{w.minimumDealScore} · {w.alertFrequency} alerts
                      </div>
                    </div>
                    <button onClick={() => storeActions.deleteWatchlist(w.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-semibold text-[var(--success)]">{matches.length}</span> current matches
                  </div>
                  {matches.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {matches.slice(0, 3).map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2 text-xs">
                          <Link to="/deals/$dealId" params={{ dealId: d.id }} className="min-w-0 flex-1 truncate hover:underline">
                            {d.title} <span className="text-muted-foreground">· ${d.pricePerPerson}/pp</span>
                          </Link>
                          <ViewDealButton
                            deal={d}
                            clickedFrom="watchlist"
                            watchlistId={w.id}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-foreground px-2 py-1 text-[10px] font-semibold text-background"
                          >
                            Check <ExternalLink className="h-3 w-3" />
                          </ViewDealButton>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl"><Heart className="h-5 w-5" /> Saved deals · {saved.length}</h2>
        {saved.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Tap the heart on any deal to save it here. <a href="/" className="underline">Browse Today's Best Escapes →</a>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((d) => <DealCard key={d.id} deal={d} clickedFrom="deal_card" />)}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function NewWatchlistForm({ onDone, prefillDest }: { onDone: () => void; prefillDest?: string | null }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [airport, setAirport] = useState("BOS");
  const [maxPrice, setMaxPrice] = useState(1500);
  const [minScore, setMinScore] = useState(75);
  const [dest, setDest] = useState<string>(prefillDest ?? "Anywhere");

  // Prefill airport + budget from saved profile preferences.
  useEffect(() => {
    let active = true;
    if (!user) return;
    loadProfileAndPrefs(user.id).then(({ profile, prefs }) => {
      if (!active) return;
      if (profile.home_airport) setAirport(profile.home_airport);
      if (prefs.budgetPerPerson) setMaxPrice(prefs.budgetPerPerson);
      if (prefillDest) {
        const d = mockDestinations.find((x) => x.id === prefillDest);
        if (d) setName(`Deals to ${d.name}`);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id, prefillDest]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        storeActions.addWatchlist({
          id: crypto.randomUUID(), userId: "me",
          name: name || "Untitled search", homeAirport: airport, backupAirports: [],
          destinations: dest === "Anywhere" ? "Anywhere" : [dest],
          flexibleDates: true, minNights: 4, maxNights: 7,
          maxPricePerPerson: maxPrice, adultsOnlyRequired: false, familyFriendlyRequired: false,
          minimumResortRating: 4, nonstopPreferred: true, flightIncludedRequired: true,
          transfersPreferred: true, minimumDealScore: minScore, alertFrequency: "daily",
          enabled: true, createdAt: new Date().toISOString(),
        });
        onDone();
      }}
      className="mt-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Search name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2" />
      <input value={airport} onChange={(e) => setAirport(e.target.value.toUpperCase())} placeholder="Airport" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <select value={dest} onChange={(e) => setDest(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
        <option value="Anywhere">Anywhere</option>
        {mockDestinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <div className="flex items-center gap-2 text-xs">
        <label>≤${maxPrice}</label>
        <input type="range" min={500} max={3500} step={50} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="flex-1 accent-[var(--ocean)]" />
      </div>
      <div className="flex items-center gap-2 text-xs sm:col-span-2">
        <label>Score ≥{minScore}</label>
        <input type="range" min={0} max={95} step={5} value={minScore} onChange={(e) => setMinScore(+e.target.value)} className="flex-1 accent-[var(--ocean)]" />
      </div>
      <button className="rounded-lg bg-foreground py-2 text-sm font-semibold text-background sm:col-span-3 lg:col-span-3">Create</button>
    </form>
  );
}
