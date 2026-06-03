import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { useStore, useAllDealsAdmin, storeActions, getCurrentUserId } from "@/lib/store";
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
import {
  loadDealSources,
  upsertDealSource,
  toggleDealSourceEnabled,
  deleteDealSource,
  type DealSourceRow,
} from "@/lib/admin/dealSources";
import { addSnapshot, loadClickAnalytics } from "@/lib/admin/priceSnapshots";
import { freshnessOf, expiringSoon, freshnessLabel } from "@/lib/dealFreshness";
import {
  resolveSourceName,
  flagDeal,
  unflagDeal,
  expireDeal,
  restoreDeal,
  markVerifiedToday,
  recalculateScore,
  duplicateDeal,
  archiveDeal,
} from "@/lib/admin/dealOps";
import { getReadiness, readinessLabel, readinessColorClass } from "@/lib/dealReadiness";
import { getAppMode, isProductionMode } from "@/lib/appMode";
import { useAppSettings, setAppSetting, type AppSettings } from "@/lib/admin/appSettings";
import { logAudit } from "@/lib/admin/auditLog";
import { loadRecentAudit, type AuditLogEntry } from "@/lib/admin/auditLog";
import { tryGenerateAffiliateLink, AFFILIATE_HELPER_TEXT, describeAffiliateReadiness } from "@/lib/affiliates/AffiliateLinkService";
import { getAffiliateProviderStatus } from "@/lib/affiliates/providerStatus.functions";
import type { Deal } from "@/lib/types";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Azulva Admin" }] }),
  component: () => <AdminGuard><AdminPage /></AdminGuard>,
});

function AdminPage() {
  const s = useStore();
  const deals = useAllDealsAdmin();
  const [health, setHealth] = useState<ProviderHealth[]>([]);
  const [recent, setRecent] = useState<ProviderHealth[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sources, setSources] = useState<DealSourceRow[]>([]);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof loadClickAnalytics>> | null>(null);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const settings = useAppSettings();
  const fetchRecent = useServerFn(getApiHealthRecent);
  const fetchIntel = useServerFn(getDestinationIntelligence);

  async function loadAll() {
    const [providerHealth, recentRes, src, an, log] = await Promise.all([
      Promise.all(allProviders.map((p) => p.health())),
      fetchRecent(),
      loadDealSources(),
      loadClickAnalytics(),
      loadRecentAudit(50),
    ]);
    setHealth(providerHealth);
    setRecent(recentRes.entries);
    setSources(src);
    setAnalytics(an);
    setAudit(log);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

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
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }

  // Quality queue calculations
  const prodMode = isProductionMode();
  const refOnlySourceIds = new Set(sources.filter((s) => s.approved_linking_method === "reference_only").map((s) => s.id));
  const manualVerifySourceIds = new Set(sources.filter((s) => s.requires_manual_verification).map((s) => s.id));
  const expectsAffiliateSourceIds = new Set(sources.filter((s) => s.affiliate_supported || s.approved_linking_method === "generated_affiliate_url" || s.approved_linking_method === "manual_affiliate_url").map((s) => s.id));
  const STALE_VERIFY_MS = 7 * 24 * 60 * 60 * 1000;
  const quality = {
    missingAffiliate: deals.filter((d) => d.status !== "expired" && !d.affiliateUrl && !d.generatedAffiliateUrl),
    missingSource: deals.filter((d) => d.status !== "expired" && !d.sourceUrl),
    unclearAi: deals.filter((d) => d.allInclusiveConfidence === "Unclear" || d.allInclusiveConfidence === "Unknown"),
    stale: deals.filter((d) => { const f = freshnessOf(d); return f === "stale" || f === "aging"; }),
    expiringSoon: deals.filter((d) => expiringSoon(d)),
    sampleDeals: deals.filter((d) => d.sourceLabel === "Sample Deal"),
    missingSourceId: deals.filter((d) => d.sourceLabel !== "Sample Deal" && !d.sourceId),
    missingDestination: deals.filter((d) => !d.destinationId),
    missingResort: deals.filter((d) => !d.resortId),
    missingPrice: deals.filter((d) => !d.pricePerPerson || !d.currencyCode),
    expiredButActive: deals.filter((d) => d.status === "active" && d.expiresAt && new Date(d.expiresAt) < new Date()),
    notPublishReady: deals.filter((d) => {
      const r = getReadiness(d);
      return d.status === "active" && (r.state === "missing_critical" || r.state === "needs_review");
    }),
    sampleInProd: prodMode ? deals.filter((d) => d.sourceLabel === "Sample Deal") : [],
    activeRefOnly: deals.filter((d) => d.status === "active" && d.sourceId && refOnlySourceIds.has(d.sourceId)),
    activeNeedsManualVerify: deals.filter((d) => {
      if (d.status !== "active" || !d.sourceId || !manualVerifySourceIds.has(d.sourceId)) return false;
      const last = d.lastCheckedAt ? new Date(d.lastCheckedAt).getTime() : 0;
      return !last || Date.now() - last > STALE_VERIFY_MS;
    }),
    activeNoOutbound: deals.filter((d) => d.status === "active" && !d.sourceUrl && !d.affiliateUrl && !d.generatedAffiliateUrl),
    activeAffiliateExpectedButDirect: deals.filter((d) => d.status === "active" && d.sourceUrl && !d.affiliateUrl && !d.generatedAffiliateUrl && d.sourceId && expectsAffiliateSourceIds.has(d.sourceId)),
  };

  const sourceLookup = new Map(sources.map((x) => [x.id, x] as const));

  const adminLinks = [
    { label: "Dashboard", to: "#dash" },
    { label: "Launch Readiness", to: "#launch" },
    { label: "Settings", to: "#settings" },
    { label: "Deals", to: "#deals" },
    { label: "Deal Quality", to: "#quality" },
    { label: "Deal Sources", to: "#sources" },
    { label: "Outbound Clicks", to: "#clicks" },
    { label: "Affiliate Setup", to: "#affiliate" },
    { label: "Audit Log", to: "#audit" },
    { label: "Destinations", to: "#destinations" },
    { label: "Resorts", to: "#resorts" },
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="font-display text-3xl">Azulva Admin</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${prodMode ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--warning)]/15 text-[var(--warning)]"}`}>
                {getAppMode().toUpperCase()} MODE
              </span>
            </div>
            {prodMode && quality.sampleInProd.length > 0 && (
              <div className="mt-3 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-3 text-xs">
                ⚠️ Production mode is on but {quality.sampleInProd.length} sample/mock deal(s) are still in the catalog. They are hidden from user feeds but visible here for review.
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Stat label="Total deals" v={deals.length} />
              <Stat label="Sources" v={sources.length} />
              <Stat label="Outbound clicks" v={analytics?.total ?? s.outboundClicks.length} />
              <Stat label="Quality issues" v={quality.missingAffiliate.length + quality.missingSource.length + quality.unclearAi.length + quality.notPublishReady.length} />
            </div>
          </section>

          <LaunchReadinessPanel deals={deals} sources={sources} settings={settings} />

          <SettingsPanel settings={settings} onChanged={loadAll} />

          <section id="deals" className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl">Deals</h2>
              <div className="flex gap-2">
                <Link to="/admin/import" className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">Import CSV</Link>
                <Link to="/admin/deals/new" className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background">+ New deal</Link>
              </div>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2">Title</th>
                    <th>Source</th>
                    <th>Price</th>
                    <th>Score</th>
                    <th>Freshness</th>
                    <th>Readiness</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d) => {
                    const f = freshnessOf(d);
                    const isCustom = !!s.customDeals.find((cd) => cd.id === d.id);
                    const r = getReadiness(d);
                    return (
                      <tr key={d.id} className="border-t border-border align-top">
                        <td className="py-2"><Link to="/deals/$dealId" params={{ dealId: d.id }} className="hover:underline">{d.title}</Link>
                          {d.status !== "active" && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{d.status}</span>}
                        </td>
                        <td className="text-xs">{resolveSourceName(d, sources)}</td>
                        <td>${d.pricePerPerson}</td>
                        <td>{d.dealScore}</td>
                        <td className="text-xs">{freshnessLabel(f)}</td>
                        <td><span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${readinessColorClass(r.state)}`}>{readinessLabel(r.state)}</span></td>
                        <td className="space-x-1 whitespace-nowrap py-2">
                          <SnapshotInline deal={d} onAdded={loadAll} />
                          {isCustom && <>
                            <Link to="/admin/deals/$dealId/edit" params={{ dealId: d.id }} className="rounded bg-muted px-1.5 py-0.5 text-[10px] hover:bg-muted/70">Edit</Link>
                            <DealOpsMenu deal={d} />
                          </>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section id="quality" className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl mb-3">Deal Quality Queue</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <QualityList title="Missing affiliate URL" deals={quality.missingAffiliate} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Missing source URL" deals={quality.missingSource} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Missing source ID" deals={quality.missingSourceId} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Missing destination" deals={quality.missingDestination} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Missing resort name" deals={quality.missingResort} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Missing price/currency" deals={quality.missingPrice} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="All-inclusive unclear" deals={quality.unclearAi} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Stale / aging (>3 days)" deals={quality.stale} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Expiring soon" deals={quality.expiringSoon} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Expired but still active" deals={quality.expiredButActive} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Active but not publish-ready" deals={quality.notPublishReady} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Sample / mock deals" deals={quality.sampleDeals} customIds={s.customDeals.map((d) => d.id)} />
              {prodMode && <QualityList title="Sample deals visible in production" deals={quality.sampleInProd} customIds={s.customDeals.map((d) => d.id)} />}
              <QualityList title="Active · reference-only source" deals={quality.activeRefOnly} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Active · needs manual verification (>7d)" deals={quality.activeNeedsManualVerify} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Active · no outbound URL" deals={quality.activeNoOutbound} customIds={s.customDeals.map((d) => d.id)} />
              <QualityList title="Active · source URL only, affiliate expected" deals={quality.activeAffiliateExpectedButDirect} customIds={s.customDeals.map((d) => d.id)} />
            </div>
          </section>


          <section id="sources" className="rounded-2xl border border-border bg-card p-5">
            <DealSourcesPanel sources={sources} onChange={loadAll} />
          </section>

          <section id="clicks" className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-xl mb-3">Outbound clicks ({analytics?.total ?? 0})</h2>
            {!analytics || analytics.total === 0 ? (
              <p className="text-sm text-muted-foreground">No clicks tracked yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <ClickBreakdown title="By source" rows={analytics.bySource.map((r) => ({
                  label: r.source_id ? (sourceLookup.get(r.source_id)?.name ?? r.source_id) : "—",
                  count: r.count,
                }))} />
                <ClickBreakdown title="Top deals" rows={analytics.byDeal.map((r) => ({
                  label: deals.find((d) => d.id === r.deal_id)?.title ?? r.deal_id,
                  count: r.count,
                }))} />
                <ClickBreakdown title="By destination" rows={analytics.byDestination.map((r) => ({
                  label: r.destination_id ? (mockDestinations.find((d) => d.id === r.destination_id)?.name ?? r.destination_id) : "—",
                  count: r.count,
                }))} />
                <ClickBreakdown title="Signed-in vs anonymous" rows={[
                  { label: "Signed in", count: analytics.signedInVsAnon.signed_in },
                  { label: "Anonymous", count: analytics.signedInVsAnon.anon },
                ]} />
                <ClickBreakdown title="By click surface (clickedFrom)" rows={analytics.byClickedFrom.map((r) => ({ label: r.clicked_from, count: r.count }))} />
              </div>
            )}
            {analytics && analytics.total > 0 && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Unknown / "other" attribution: {analytics.unknownAttributionCount} of {analytics.total} ({Math.round((analytics.unknownAttributionCount / analytics.total) * 100)}%).
              </p>
            )}
          </section>

          <AffiliateSetupPanel deals={deals} sources={sources} analytics={analytics} onChange={loadAll} />


          <AuditLogSection audit={audit} />

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

function QualityList({ title, deals, customIds }: { title: string; deals: Deal[]; customIds?: string[] }) {
  const customSet = new Set(customIds ?? []);
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{deals.length}</span>
      </div>
      {deals.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">All clear.</p> : (
        <ul className="mt-2 max-h-56 space-y-1 overflow-auto text-xs">
          {deals.slice(0, 10).map((d) => (
            <li key={d.id} className="space-y-1 border-b border-border/40 pb-1 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <Link to="/deals/$dealId" params={{ dealId: d.id }} className="truncate hover:underline">{d.title}</Link>
                <span className="text-muted-foreground">${d.pricePerPerson}</span>
              </div>
              {customSet.has(d.id) && <DealOpsMenu deal={d} compact />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClickBreakdown({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {rows.length === 0 ? <p className="text-xs text-muted-foreground">No data.</p> : (
        <ul className="space-y-1 text-xs">
          {rows.slice(0, 8).map((r, i) => (
            <li key={i}>
              <div className="flex items-center justify-between"><span className="truncate pr-2">{r.label}</span><span className="text-muted-foreground tabular-nums">{r.count}</span></div>
              <div className="mt-0.5 h-1.5 w-full rounded bg-muted"><div className="h-full rounded bg-[var(--ocean)]" style={{ width: `${(r.count / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SnapshotInline({ deal, onAdded }: { deal: Deal; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(deal.pricePerPerson);
  const [saving, setSaving] = useState(false);
  async function submit() {
    const uid = getCurrentUserId();
    if (!uid) { alert("Sign in to record a snapshot."); return; }
    setSaving(true);
    const res = await addSnapshot({
      dealId: deal.id,
      pricePerPerson: price,
      currency: deal.currencyCode,
      sourceId: deal.sourceId ?? null,
      resortName: deal.title,
      departureAirport: deal.departureAirport,
      startDate: deal.startDate,
      endDate: deal.endDate,
      nights: deal.nights,
      sourceUrl: deal.sourceUrl,
      capturedByUser: uid,
    });
    setSaving(false);
    if (!res.ok) { alert(res.error); return; }
    setOpen(false);
    onAdded();
  }
  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-xs text-muted-foreground hover:underline">+ Snapshot</button>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} className="w-20 rounded border border-border bg-background px-2 py-0.5 text-xs" />
      <button onClick={submit} disabled={saving} className="rounded bg-foreground px-2 py-0.5 text-[10px] text-background disabled:opacity-60">{saving ? "…" : "Save"}</button>
      <button onClick={() => setOpen(false)} className="text-[10px] text-muted-foreground">×</button>
    </span>
  );
}

function DealSourcesPanel({ sources, onChange }: { sources: DealSourceRow[]; onChange: () => void }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl">Deal Sources</h2>
        <button onClick={() => { setEditingId(null); setCreating((c) => !c); }} className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background">
          {creating ? "Cancel" : "+ New source"}
        </button>
      </div>
      {creating && <SourceForm onSaved={() => { setCreating(false); onChange(); }} />}
      <ul className="mt-3 space-y-2">
        {sources.map((src) => (
          <li key={src.id} className="rounded-lg border border-border p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{src.name} <span className="text-xs text-muted-foreground">· {src.source_type} · trust {src.trust_level}</span></div>
                <div className="text-xs text-muted-foreground">
                  {src.affiliate_supported ? "Affiliate-ready · " : ""}
                  {src.api_supported ? "API-ready · " : ""}
                  {src.requires_manual_verification ? "Manual verification required · " : ""}
                  {src.approved_linking_method ? `Link: ${src.approved_linking_method} · ` : ""}
                  {src.notes ?? ""}
                </div>
                {src.default_disclaimer && (
                  <div className="mt-1 text-[11px] italic text-muted-foreground">“{src.default_disclaimer}”</div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={src.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      toggleDealSourceEnabled(src.id, enabled).then(() => {
                        logAudit({ action: "toggle_deal_source", entityType: "deal_source", entityId: src.id, before: { enabled: src.enabled }, after: { enabled } });
                        onChange();
                      });
                    }}
                  />
                  Enabled
                </label>
                <button onClick={() => { setCreating(false); setEditingId(editingId === src.id ? null : src.id); }} className="rounded bg-muted px-1.5 py-0.5 hover:bg-muted/70">
                  {editingId === src.id ? "Close" : "Edit"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete source "${src.name}"?`)) {
                      deleteDealSource(src.id).then(() => {
                        logAudit({ action: "delete_deal_source", entityType: "deal_source", entityId: src.id, before: src });
                        onChange();
                      });
                    }
                  }}
                  className="text-destructive hover:underline"
                >Delete</button>
              </div>
            </div>
            {editingId === src.id && (
              <div className="mt-3">
                <SourceForm initial={src} onSaved={() => { setEditingId(null); onChange(); }} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const LINKING_METHODS = [
  { value: "", label: "—" },
  { value: "direct_source_url", label: "Direct source URL" },
  { value: "manual_affiliate_url", label: "Manual affiliate URL" },
  { value: "generated_affiliate_url", label: "Generated affiliate URL" },
  { value: "reference_only", label: "Reference only" },
] as const;

function SourceForm({ initial, onSaved }: { initial?: DealSourceRow; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [sourceType, setSourceType] = useState<DealSourceRow["source_type"]>(initial?.source_type ?? "manual");
  const [trust, setTrust] = useState<DealSourceRow["trust_level"]>(initial?.trust_level ?? "medium");
  const [affiliate, setAffiliate] = useState(initial?.affiliate_supported ?? false);
  const [api, setApi] = useState(initial?.api_supported ?? false);
  const [baseUrl, setBaseUrl] = useState(initial?.base_url ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [approvedLinking, setApprovedLinking] = useState(initial?.approved_linking_method ?? "");
  const [requiresManual, setRequiresManual] = useState(initial?.requires_manual_verification ?? false);
  const [disclaimer, setDisclaimer] = useState(initial?.default_disclaimer ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const before = initial;
    const payload = {
      id: initial?.id,
      name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      source_type: sourceType, trust_level: trust,
      affiliate_supported: affiliate, api_supported: api,
      base_url: baseUrl || null, enabled: initial?.enabled ?? true, notes: notes || null,
      approved_linking_method: approvedLinking || null,
      requires_manual_verification: requiresManual,
      default_disclaimer: disclaimer || null,
    };
    const res = await upsertDealSource(payload);
    setSaving(false);
    if (!res.ok) { alert(res.error); return; }
    logAudit({
      action: initial ? "update_deal_source" : "create_deal_source",
      entityType: "deal_source",
      entityId: initial?.id ?? res.id,
      before: before ?? null,
      after: payload,
    });
    onSaved();
  }
  return (
    <form onSubmit={submit} className="grid gap-2 rounded-lg border border-border p-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded border border-border bg-background px-2 py-1" /></label>
        <label>Slug<input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto" className="mt-1 w-full rounded border border-border bg-background px-2 py-1" /></label>
        <label>Type
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value as DealSourceRow["source_type"])} className="mt-1 w-full rounded border border-border bg-background px-2 py-1">
            <option value="manual">manual</option><option value="affiliate">affiliate</option>
            <option value="api">api</option><option value="partner">partner</option><option value="mock">mock</option>
          </select>
        </label>
        <label>Trust
          <select value={trust} onChange={(e) => setTrust(e.target.value as DealSourceRow["trust_level"])} className="mt-1 w-full rounded border border-border bg-background px-2 py-1">
            <option value="high">high</option><option value="medium">medium</option>
            <option value="low">low</option><option value="unknown">unknown</option>
          </select>
        </label>
        <label className="col-span-2">Base URL<input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-2 py-1" /></label>
        <label className="col-span-2">Notes<input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-2 py-1" /></label>
        <label className="col-span-2">
          Approved linking method
          <select value={approvedLinking} onChange={(e) => setApprovedLinking(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-2 py-1">
            {LINKING_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <span className="mt-1 block text-[11px] text-muted-foreground">How Azulva should link to this source: direct source URL, manual affiliate URL, generated affiliate URL, or reference only.</span>
        </label>
        <label className="col-span-2 inline-flex items-start gap-2 text-xs">
          <input type="checkbox" className="mt-0.5" checked={requiresManual} onChange={(e) => setRequiresManual(e.target.checked)} />
          <span>
            <span className="font-medium">Requires manual verification</span>
            <span className="block text-muted-foreground">Use this when prices or inclusions must be manually checked before a deal is published.</span>
          </span>
        </label>
        <label className="col-span-2">
          Default disclaimer
          <textarea value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} rows={2} className="mt-1 w-full rounded border border-border bg-background px-2 py-1" />
          <span className="mt-1 block text-[11px] text-muted-foreground">Source-specific note shown in admin or deal verification when this source is used.</span>
        </label>
        <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" checked={affiliate} onChange={(e) => setAffiliate(e.target.checked)} /> Affiliate-supported</label>
        <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" checked={api} onChange={(e) => setApi(e.target.checked)} /> API-supported</label>
      </div>
      <button disabled={saving} className="self-start rounded bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-60">{saving ? "Saving…" : (initial ? "Save changes" : "Create source")}</button>
    </form>
  );
}

function DealOpsMenu({ deal, compact }: { deal: Deal; compact?: boolean }) {
  function ask(label: string): string | null { const v = prompt(label); return v; }
  const btn = `rounded bg-muted px-1.5 py-0.5 hover:bg-muted/70 ${compact ? "text-[10px]" : "text-[10px]"}`;
  function mutate(action: string, fn: (d: Deal) => Deal) {
    storeActions.updateCustomDeal(deal.id, (d) => {
      const next = fn(d);
      logAudit({ action: action as never, entityType: "deal", entityId: d.id, before: d, after: next });
      return next;
    });
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Link to="/admin/deals/$dealId/edit" params={{ dealId: deal.id }} className={btn}>Edit</Link>
      <button onClick={() => mutate("mark_verified", markVerifiedToday)} className={btn}>Verify</button>
      <button onClick={() => mutate("recalculate_score", recalculateScore)} className={btn}>Recalc</button>
      {deal.status !== "flagged" ? (
        <button onClick={() => { const r = ask("Flag reason?"); if (r !== null) mutate("flag_deal", (d) => flagDeal(d, r)); }} className={btn}>Flag</button>
      ) : (
        <button onClick={() => mutate("unflag_deal", unflagDeal)} className={btn}>Unflag</button>
      )}
      {deal.status !== "expired" && deal.status !== "archived" && (
        <button onClick={() => mutate("expire_deal", expireDeal)} className={btn}>Expire</button>
      )}
      {deal.status !== "archived" ? (
        <button onClick={() => mutate("archive_deal", archiveDeal)} className={btn}>Archive</button>
      ) : (
        <button onClick={() => mutate("restore_deal", restoreDeal)} className={btn}>Restore</button>
      )}
      <button onClick={() => { storeActions.duplicateCustomDeal(deal.id, duplicateDeal); logAudit({ action: "duplicate_deal", entityType: "deal", entityId: deal.id }); }} className={btn}>Dup</button>
      <button onClick={() => { if (confirm("Delete deal?")) { logAudit({ action: "delete_deal", entityType: "deal", entityId: deal.id, before: deal }); storeActions.deleteCustomDeal(deal.id); } }} className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive">Del</button>
    </span>
  );
}

function LaunchReadinessPanel({ deals, sources, settings }: { deals: Deal[]; sources: DealSourceRow[]; settings: AppSettings }) {
  const active = deals.filter((d) => d.status === "active");
  type Check = { label: string; state: "ready" | "needs_review" | "blocking"; detail?: string };
  const checks: Check[] = [
    { label: `App mode: ${settings.app_mode}`, state: "ready" },
    { label: `Sample deals visible to users: ${settings.show_sample_deals ? "yes" : "no"}`, state: settings.app_mode === "production" && settings.show_sample_deals ? "needs_review" : "ready" },
    { label: "Active deals missing source URL", state: active.filter((d) => !d.sourceUrl).length === 0 ? "ready" : "blocking", detail: `${active.filter((d) => !d.sourceUrl).length}` },
    { label: "Active deals missing outbound (affiliate or source URL)", state: active.filter((d) => !d.affiliateUrl && !d.generatedAffiliateUrl && !d.sourceUrl).length === 0 ? "ready" : "blocking", detail: `${active.filter((d) => !d.affiliateUrl && !d.generatedAffiliateUrl && !d.sourceUrl).length}` },
    { label: "Active deals not verified recently", state: active.filter((d) => { const f = freshnessOf(d); return f === "stale" || f === "aging"; }).length === 0 ? "ready" : "needs_review", detail: `${active.filter((d) => { const f = freshnessOf(d); return f === "stale" || f === "aging"; }).length}` },
    { label: "Active deals with unclear all-inclusive status", state: active.filter((d) => d.allInclusiveConfidence === "Unclear" || d.allInclusiveConfidence === "Unknown").length === 0 ? "ready" : "needs_review", detail: `${active.filter((d) => d.allInclusiveConfidence === "Unclear" || d.allInclusiveConfidence === "Unknown").length}` },
    { label: "Active deals missing destination/resort/price", state: active.filter((d) => !d.destinationId || !d.resortId || !d.pricePerPerson).length === 0 ? "ready" : "blocking", detail: `${active.filter((d) => !d.destinationId || !d.resortId || !d.pricePerPerson).length}` },
    { label: "Affiliate disclosure enabled", state: settings.affiliate_disclosure_enabled ? "ready" : "blocking" },
    { label: "Verification notice enabled", state: settings.verification_notice_enabled ? "ready" : "needs_review" },
    { label: "Deal sources configured", state: sources.length > 0 ? "ready" : "blocking", detail: `${sources.length}` },
  ];
  const color = (s: Check["state"]) =>
    s === "ready" ? "bg-[var(--success)]/15 text-[var(--success)]"
    : s === "needs_review" ? "bg-[var(--warning)]/15 text-[var(--warning)]"
    : "bg-destructive/15 text-destructive";
  return (
    <section id="launch" className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-xl mb-3">Launch Readiness</h2>
      <p className="mb-3 text-xs text-muted-foreground">Guidance only — does not block deployment.</p>
      <ul className="space-y-1.5 text-sm">
        {checks.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2">
            <span>{c.label}{c.detail ? <span className="ml-2 text-xs text-muted-foreground">({c.detail})</span> : null}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${color(c.state)}`}>{c.state.replace("_", " ")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SettingsPanel({ settings, onChanged }: { settings: AppSettings; onChanged: () => void }) {
  const [saving, setSaving] = useState<string | null>(null);
  async function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSaving(key);
    const before = settings[key];
    const res = await setAppSetting(key, value);
    setSaving(null);
    if (!res.ok) { alert(res.error); return; }
    logAudit({ action: "update_app_setting", entityType: "app_setting", entityId: key, before: { [key]: before }, after: { [key]: value } });
    onChanged();
  }
  return (
    <section id="settings" className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-xl mb-3">App Settings</h2>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <label className="flex items-center justify-between rounded-lg border border-border p-2">
          <span>App mode</span>
          <select
            disabled={saving === "app_mode"}
            value={settings.app_mode}
            onChange={(e) => update("app_mode", e.target.value as AppSettings["app_mode"])}
            className="rounded border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="demo">demo</option>
            <option value="production">production</option>
          </select>
        </label>
        {(["show_sample_deals", "allow_public_custom_deals", "affiliate_disclosure_enabled", "verification_notice_enabled"] as const).map((k) => (
          <label key={k} className="flex items-center justify-between rounded-lg border border-border p-2">
            <span>{k.replace(/_/g, " ")}</span>
            <input
              type="checkbox"
              disabled={saving === k}
              checked={settings[k]}
              onChange={(e) => update(k, e.target.checked)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function AuditLogSection({ audit }: { audit: AuditLogEntry[] }) {
  return (
    <section id="audit" className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-xl mb-3">Admin Audit Log</h2>
      {audit.length === 0 ? (
        <p className="text-sm text-muted-foreground">No actions logged yet.</p>
      ) : (
        <ul className="max-h-80 space-y-1 overflow-auto text-xs">
          {audit.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 py-1">
              <span className="font-medium">{a.action}</span>
              <span className="text-muted-foreground">{a.entity_type ?? "—"} {a.entity_id ? `· ${a.entity_id.slice(0, 8)}` : ""}</span>
              <span className="text-muted-foreground" suppressHydrationWarning>{new Date(a.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type ProviderStatus = Awaited<ReturnType<typeof getAffiliateProviderStatus>>;

function AffiliateSetupPanel({ deals, sources, analytics, onChange }: {
  deals: Deal[];
  sources: DealSourceRow[];
  analytics: Awaited<ReturnType<typeof loadClickAnalytics>> | null;
  onChange: () => void;
}) {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const fetchStatus = useServerFn(getAffiliateProviderStatus);
  useEffect(() => { fetchStatus().then(setStatus); }, [fetchStatus]);

  const tp = status?.travelpayouts;
  const providerConfigured = !!(tp?.tokenConfigured && tp?.markerConfigured);
  const affiliateReadySources = sources.filter((s) => s.affiliate_supported);
  const refOnlySources = sources.filter((s) => s.approved_linking_method === "reference_only");
  const manualVerifySources = sources.filter((s) => s.requires_manual_verification);
  const withGenerated = deals.filter((d) => d.generatedAffiliateUrl);
  const withManual = deals.filter((d) => !d.generatedAffiliateUrl && d.affiliateUrl);
  const directOnly = deals.filter((d) => !d.generatedAffiliateUrl && !d.affiliateUrl && d.sourceUrl);
  const noOutbound = deals.filter((d) => !d.generatedAffiliateUrl && !d.affiliateUrl && !d.sourceUrl);

  async function generateMissing(force: boolean) {
    setBusy(true);
    setLog([]);
    const targets = deals.filter((d) =>
      d.sourceUrl && (force || !d.generatedAffiliateUrl),
    );
    let ok = 0, fail = 0;
    for (const d of targets) {
      const res = await tryGenerateAffiliateLink(d.sourceUrl, {
        sourceSlug: sources.find((s) => s.id === d.sourceId)?.slug,
        dealId: d.id,
        destinationSlug: d.destinationId,
      });
      if (res.affiliateUrl) {
        storeActions.updateCustomDeal(d.id, (cur) => ({ ...cur, generatedAffiliateUrl: res.affiliateUrl! }));
        ok++;
        setLog((l) => [...l, `✓ ${d.title}`]);
      } else {
        fail++;
        setLog((l) => [...l, `✗ ${d.title} — ${res.reason}`]);
      }
      logAudit({ action: force ? "regenerate_affiliate_link" : "generate_affiliate_link", entityType: "deal", entityId: d.id, after: { reason: res.reason, provider: res.provider } });
    }
    setBusy(false);
    alert(`Generated ${ok} link(s). ${fail} failed/skipped.`);
    onChange();
  }

  const readinessRows = [
    { label: "Travelpayouts token", ok: !!tp?.tokenConfigured },
    { label: "Travelpayouts marker", ok: !!tp?.markerConfigured },
    { label: "Travelpayouts project ID (optional)", ok: !!tp?.projectIdConfigured, optional: true },
  ];

  return (
    <section id="affiliate" className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-xl mb-3">Affiliate Setup</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Connect to the relevant affiliate programs before expecting partner links to monetize.
        If a program does not support deep links, use the approved link format from that program.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <div className="mb-2 text-sm font-semibold">Provider configuration</div>
          <ul className="space-y-1 text-xs">
            {readinessRows.map((r) => (
              <li key={r.label} className="flex items-center justify-between">
                <span>{r.label}{r.optional && <span className="ml-1 text-muted-foreground">(optional)</span>}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.ok ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--warning)]/15 text-[var(--warning)]"}`}>
                  {r.ok ? "configured" : "missing"}
                </span>
              </li>
            ))}
          </ul>
          {!providerConfigured && (
            <p className="mt-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-2 text-[11px]">
              Without a token + marker, link generation returns "not_configured" and the CTA falls back to the direct/manual URL.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border p-3">
          <div className="mb-2 text-sm font-semibold">Coverage</div>
          <ul className="space-y-1 text-xs">
            <li className="flex justify-between"><span>Affiliate-supported sources</span><span className="tabular-nums">{affiliateReadySources.length}</span></li>
            <li className="flex justify-between"><span>Deals with generated affiliate URL</span><span className="tabular-nums">{withGenerated.length}</span></li>
            <li className="flex justify-between"><span>Deals with manual affiliate URL</span><span className="tabular-nums">{withManual.length}</span></li>
            <li className="flex justify-between"><span>Deals with direct-only URL</span><span className="tabular-nums">{directOnly.length}</span></li>
            <li className="flex justify-between"><span>Deals with no outbound URL</span><span className="tabular-nums">{noOutbound.length}</span></li>
            <li className="flex justify-between"><span>Sources requiring manual verification</span><span className="tabular-nums">{manualVerifySources.length}</span></li>
            <li className="flex justify-between"><span>Reference-only sources</span><span className="tabular-nums">{refOnlySources.length}</span></li>
          </ul>
        </div>
      </div>

      {analytics && analytics.total > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-sm font-semibold">Clicks by surface (clickedFrom)</div>
            <ul className="space-y-1 text-xs">
              {analytics.byClickedFrom.map((r) => (
                <li key={r.clicked_from} className="flex justify-between"><span>{r.clicked_from}</span><span className="tabular-nums">{r.count}</span></li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Unknown / "other" attribution: <span className="font-semibold">{analytics.unknownAttributionCount}</span> of {analytics.total}.
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-sm font-semibold">Playbook flags</div>
            {manualVerifySources.length === 0 && refOnlySources.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sources flagged.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {manualVerifySources.map((s) => (
                  <li key={s.id} className="flex justify-between"><span>{s.name}</span><span className="text-muted-foreground">manual verify</span></li>
                ))}
                {refOnlySources.map((s) => (
                  <li key={`r-${s.id}`} className="flex justify-between"><span>{s.name}</span><span className="text-muted-foreground">reference only</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}


      <div className="mt-4 rounded-xl border border-border p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">Batch affiliate link generation</div>
          <div className="flex gap-2">
            <button onClick={() => generateMissing(false)} disabled={busy} className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-60">
              {busy ? "Generating…" : "Generate missing links"}
            </button>
            <button onClick={() => { if (confirm("Regenerate ALL affiliate links? Existing generated URLs will be overwritten.")) generateMissing(true); }} disabled={busy} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-60">
              Regenerate all
            </button>
          </div>
        </div>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-muted-foreground">
          {AFFILIATE_HELPER_TEXT.map((t) => <li key={t}>{t}</li>)}
        </ul>
        {log.length > 0 && (
          <ul className="mt-3 max-h-40 overflow-auto rounded-lg border border-border bg-background p-2 text-[11px] font-mono">
            {log.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-border p-3">
        <div className="mb-2 text-sm font-semibold">Per-deal affiliate readiness</div>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr><th className="py-1">Deal</th><th>State</th></tr>
            </thead>
            <tbody>
              {deals.slice(0, 50).map((d) => {
                const src = sources.find((s) => s.id === d.sourceId);
                const r = describeAffiliateReadiness({
                  sourceUrl: d.sourceUrl,
                  affiliateUrl: d.affiliateUrl,
                  generatedAffiliateUrl: d.generatedAffiliateUrl,
                  sourceAffiliateSupported: src?.affiliate_supported ?? null,
                  providerConfigured,
                });
                return (
                  <tr key={d.id} className="border-t border-border/40">
                    <td className="py-1 pr-2"><Link to="/deals/$dealId" params={{ dealId: d.id }} className="hover:underline">{d.title}</Link></td>
                    <td>{r.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
