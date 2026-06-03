import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, useAllDeals, storeActions } from "@/lib/store";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { mockResorts } from "@/lib/data/mockResorts";
import { allProviders } from "@/lib/api/providers";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { ProviderHealth } from "@/lib/api/ProviderTypes";
import {
  getApiHealthRecent,
  getDestinationIntelligence,
} from "@/lib/providers/destinationIntelligence.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Azulva Admin" }] }),
  component: AdminPage,
});

function AdminPage() {
  const s = useStore();
  const deals = useAllDeals();
  const [health, setHealth] = useState<ProviderHealth[]>([]);
  const [recent, setRecent] = useState<ProviderHealth[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const fetchRecent = useServerFn(getApiHealthRecent);
  const fetchIntel = useServerFn(getDestinationIntelligence);

  async function loadHealth() {
    const [providerHealth, recentRes] = await Promise.all([
      Promise.all(allProviders.map((p) => p.health())),
      fetchRecent(),
    ]);
    setHealth(providerHealth);
    setRecent(recentRes.entries);
  }

  useEffect(() => { loadHealth(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function refreshAllDestinations() {
    setRefreshing(true);
    try {
      for (const d of mockDestinations) {
        await fetchIntel({
          data: {
            latitude: d.latitude,
            longitude: d.longitude,
            countryCode: d.countryCode,
            currencyCode: d.currencyCode,
            placeQuery: `${d.name}, ${d.country}`,
          },
        });
      }
      await loadHealth();
    } finally {
      setRefreshing(false);
    }
  }

  const adminLinks = [
    { label: "Dashboard", to: "#dash" },
    { label: "Deals", to: "#deals" },
    { label: "Destinations", to: "#destinations" },
    { label: "Resorts", to: "#resorts" },
    { label: "Outbound Clicks", to: "#clicks" },
    { label: "API Health", to: "#health" },
  ];

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Admin</div>
          <nav className="flex flex-col gap-1 text-sm">
            {adminLinks.map((l) => <a key={l.to} href={l.to} className="rounded-lg px-2 py-1.5 hover:bg-muted">{l.label}</a>)}
          </nav>
        </aside>

        <div className="space-y-8">
          <section id="dash">
            <h1 className="font-display text-3xl">Azulva Admin</h1>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Stat label="Total deals" v={deals.length} />
              <Stat label="Destinations" v={mockDestinations.length} />
              <Stat label="Resorts" v={mockResorts.length} />
              <Stat label="Outbound clicks" v={s.outboundClicks.length} />
            </div>
          </section>

          <section id="deals" className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl">Deals</h2>
              <Link to="/admin/deals/new" className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background">+ New deal</Link>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="py-2">Title</th><th>Source</th><th>Price</th><th>Score</th><th>AI</th><th /></tr>
                </thead>
                <tbody>
                  {deals.map((d) => (
                    <tr key={d.id} className="border-t border-border">
                      <td className="py-2"><Link to="/deals/$dealId" params={{ dealId: d.id }} className="hover:underline">{d.title}</Link></td>
                      <td className="text-xs">{d.sourceLabel}</td>
                      <td>${d.pricePerPerson}</td>
                      <td>{d.dealScore}</td>
                      <td className="text-xs">{d.allInclusiveConfidence}</td>
                      <td>
                        {s.customDeals.find((cd) => cd.id === d.id) && (
                          <button onClick={() => storeActions.deleteCustomDeal(d.id)} className="text-xs text-destructive hover:underline">Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="destinations" className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl mb-3">Destinations</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {mockDestinations.map((d) => <li key={d.id} className="rounded-lg border border-border p-2 text-sm">{d.name} <span className="text-xs text-muted-foreground">· {d.country}</span></li>)}
            </ul>
          </section>

          <section id="resorts" className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl mb-3">Resorts</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {mockResorts.map((r) => <li key={r.id} className="rounded-lg border border-border p-2 text-sm">{r.name} <span className="text-xs text-muted-foreground">· {r.starRating}★ · {r.guestRating}/10</span></li>)}
            </ul>
          </section>

          <section id="clicks" className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl mb-3">Outbound clicks ({s.outboundClicks.length})</h2>
            {s.outboundClicks.length === 0 ? <p className="text-sm text-muted-foreground">No clicks tracked yet.</p> : (
              <ul className="space-y-1 text-xs">
                {s.outboundClicks.slice(0, 20).map((c) => (
                  <li key={c.id} className="flex items-center justify-between border-b border-border py-1">
                    <span>{c.dealId}</span>
                    <span className="text-muted-foreground">{new Date(c.clickedAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="health" className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl">API health</h2>
              <button
                onClick={refreshAllDestinations}
                disabled={refreshing}
                className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-60"
              >
                {refreshing ? "Refreshing…" : "Refresh destination intelligence"}
              </button>
            </div>
            <ul className="space-y-1.5 text-sm">
              {health.map((h) => (
                <li key={h.providerName} className="flex items-center justify-between rounded-lg border border-border p-2">
                  <span>{h.providerName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${h.status === "ok" ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--warning)]/15 text-[var(--warning)]"}`}>{h.status}</span>
                </li>
              ))}
            </ul>
            {recent.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Recent calls</div>
                <ul className="max-h-56 overflow-auto space-y-1 text-xs">
                  {recent.map((h, i) => (
                    <li key={i} className="flex items-center justify-between border-b border-border py-1">
                      <span className="font-medium">{h.providerName}</span>
                      <span className={h.status === "ok" ? "text-[var(--success)]" : "text-destructive"}>{h.status}</span>
                      <span className="text-muted-foreground">{h.message}</span>
                      <span className="text-muted-foreground" suppressHydrationWarning>{new Date(h.lastCheckedAt).toLocaleTimeString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
      <Outlet />
    </AppShell>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-3xl">{v}</div>
    </div>
  );
}
