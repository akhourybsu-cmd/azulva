import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { storeActions, useStore, getCurrentUserId } from "@/lib/store";
import { mockResorts } from "@/lib/data/mockResorts";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { useEffect, useMemo, useState } from "react";
import type { Deal, AllInclusiveConfidence, InclusionState } from "@/lib/types";
import { loadDealSources, type DealSourceRow } from "@/lib/admin/dealSources";
import { tryGenerateAffiliateLink } from "@/lib/affiliates/AffiliateLinkService";
import {
  flagDeal, unflagDeal, expireDeal, restoreDeal,
  markVerifiedToday, recalculateScore,
} from "@/lib/admin/dealOps";
import { addSnapshot } from "@/lib/admin/priceSnapshots";
import { getReadiness, readinessLabel, readinessColorClass } from "@/lib/dealReadiness";

export const Route = createFileRoute("/admin/deals/$dealId/edit")({
  component: () => <AdminGuard><EditDealPage /></AdminGuard>,
});

const incOpts: InclusionState[] = ["included", "not_included", "warning", "unknown"];

function EditDealPage() {
  const { dealId } = Route.useParams();
  const nav = useNavigate();
  const s = useStore();
  const deal = useMemo(() => s.customDeals.find((d) => d.id === dealId), [s.customDeals, dealId]);
  const [sources, setSources] = useState<DealSourceRow[]>([]);
  useEffect(() => { loadDealSources().then(setSources); }, []);

  // editable state
  const [form, setForm] = useState<Deal | null>(deal ?? null);
  useEffect(() => { if (deal) setForm(deal); }, [deal]);

  if (!deal) throw notFound();
  if (!form) return null;

  const readiness = getReadiness(form);

  function patch<K extends keyof Deal>(k: K, v: Deal[K]) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  function save(extra?: Partial<Deal>) {
    if (!form) return;
    const next = extra ? { ...form, ...extra } : form;
    storeActions.updateCustomDeal(form.id, () => next);
    setForm(next);
  }

  async function generateAffiliate() {
    if (!form?.sourceUrl) return;
    const res = await tryGenerateAffiliateLink(form.sourceUrl);
    if (res.affiliateUrl) patch("generatedAffiliateUrl", res.affiliateUrl);
    else alert(res.reason === "no_token"
      ? "No TRAVELPAYOUTS_TOKEN configured. Add an affiliate URL manually."
      : "Could not generate affiliate URL.");
  }

  async function addSnapshotNow() {
    if (!form) return;
    const uid = getCurrentUserId();
    if (!uid) { alert("Sign in to record a snapshot."); return; }
    const f = form;
    const r = await addSnapshot({
      dealId: f.id,
      pricePerPerson: f.pricePerPerson,
      currency: f.currencyCode,
      sourceId: f.sourceId ?? null,
      resortName: mockResorts.find((x) => x.id === f.resortId)?.name ?? null,
      departureAirport: f.departureAirport,
      startDate: f.startDate,
      endDate: f.endDate,
      nights: f.nights,
      sourceUrl: f.sourceUrl,
      capturedByUser: uid,
    });
    alert(r.ok ? "Snapshot recorded." : `Snapshot failed: ${r.error}`);
  }

  function inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />;
  }
  function sel(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
    return <select {...props} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />;
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin" className="text-xs text-muted-foreground hover:underline">← Admin</Link>
          <h1 className="font-display text-2xl">Edit deal</h1>
          <p className="text-xs text-muted-foreground">{form.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${readinessColorClass(readiness.state)}`}>
            {readinessLabel(readiness.state)}
          </span>
          <Link to="/deals/$dealId" params={{ dealId: form.id }} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
            Preview
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <form
          onSubmit={(e) => { e.preventDefault(); save(); alert("Saved."); }}
          className="grid gap-4 rounded-2xl border border-border bg-card p-5 text-sm"
        >
          <label>Title{inp({ value: form.title, onChange: (e) => patch("title", e.target.value) })}</label>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <label>Resort
              {sel({
                value: form.resortId,
                onChange: (e) => patch("resortId", e.target.value),
                children: mockResorts.map((r) => <option key={r.id} value={r.id}>{r.name}</option>),
              })}
            </label>
            <label>Destination
              {sel({
                value: form.destinationId,
                onChange: (e) => patch("destinationId", e.target.value),
                children: mockDestinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>),
              })}
            </label>
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <label>Source
              {sel({
                value: form.sourceId ?? "",
                onChange: (e) => patch("sourceId", e.target.value || null),
                children: <>
                  <option value="">— None —</option>
                  {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </>,
              })}
            </label>
            <label>Status
              {sel({
                value: form.status,
                onChange: (e) => patch("status", e.target.value as Deal["status"]),
                children: <>
                  <option value="active">active</option>
                  <option value="draft">draft</option>
                  <option value="expiring">expiring</option>
                  <option value="expired">expired</option>
                  <option value="flagged">flagged</option>
                </>,
              })}
            </label>
            <label className="sm:col-span-2">Source URL{inp({ type: "url", value: form.sourceUrl, onChange: (e) => patch("sourceUrl", e.target.value) })}</label>
            <label className="sm:col-span-2">Affiliate URL{inp({ type: "url", value: form.affiliateUrl ?? "", onChange: (e) => patch("affiliateUrl", e.target.value || undefined) })}</label>
            <div className="sm:col-span-2 flex items-center gap-2">
              <button type="button" onClick={generateAffiliate} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
                Generate affiliate URL (Travelpayouts)
              </button>
              {form.generatedAffiliateUrl && <span className="truncate text-xs text-muted-foreground">→ {form.generatedAffiliateUrl}</span>}
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label>Departure airport{inp({ value: form.departureAirport, onChange: (e) => patch("departureAirport", e.target.value.toUpperCase()) })}</label>
            <label>Arrival airport{inp({ value: form.arrivalAirport, onChange: (e) => patch("arrivalAirport", e.target.value.toUpperCase()) })}</label>
            <label>Start date{inp({ type: "date", value: form.startDate.slice(0, 10), onChange: (e) => patch("startDate", e.target.value) })}</label>
            <label>End date{inp({ type: "date", value: form.endDate.slice(0, 10), onChange: (e) => patch("endDate", e.target.value) })}</label>
            <label>Nights{inp({ type: "number", value: form.nights, onChange: (e) => patch("nights", +e.target.value) })}</label>
            <label>Price/pp{inp({ type: "number", value: form.pricePerPerson, onChange: (e) => patch("pricePerPerson", +e.target.value) })}</label>
            <label>Currency{inp({ value: form.currencyCode, onChange: (e) => patch("currencyCode", e.target.value.toUpperCase()) })}</label>
            <label>Expires at{inp({ type: "date", value: form.expiresAt?.slice(0, 10) ?? "", onChange: (e) => patch("expiresAt", e.target.value || undefined) })}</label>
            <label>Last checked{inp({ type: "date", value: form.lastCheckedAt.slice(0, 10), onChange: (e) => patch("lastCheckedAt", new Date(e.target.value).toISOString()) })}</label>
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ["Flight", "flightIncluded"],
              ["Transfers", "transfersIncluded"],
              ["Bags", "checkedBagsIncluded"],
              ["Refundable", "refundable"],
            ] as const).map(([label, key]) => (
              <label key={key}>{label}
                {sel({
                  value: form[key] as string,
                  onChange: (e) => patch(key, e.target.value as InclusionState),
                  children: incOpts.map((o) => <option key={o} value={o}>{o}</option>),
                })}
              </label>
            ))}
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label>Room type{inp({ value: form.roomType, onChange: (e) => patch("roomType", e.target.value) })}</label>
            <label>Meal plan{inp({ value: form.mealPlan, onChange: (e) => patch("mealPlan", e.target.value) })}</label>
            <label className="inline-flex items-center gap-2 self-end"><input type="checkbox" checked={form.adultsOnly} onChange={(e) => patch("adultsOnly", e.target.checked)} /> Adults-only</label>
            <label className="inline-flex items-center gap-2 self-end"><input type="checkbox" checked={form.familyFriendly} onChange={(e) => patch("familyFriendly", e.target.checked)} /> Family-friendly</label>
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <label>All-inclusive confidence
              {sel({
                value: form.allInclusiveConfidence,
                onChange: (e) => patch("allInclusiveConfidence", e.target.value as AllInclusiveConfidence),
                children: <>
                  <option>Confirmed</option><option>Likely</option><option>Unclear</option>
                  <option>Not Included</option><option>Unknown</option>
                </>,
              })}
            </label>
            <label>Source confidence
              {sel({
                value: form.sourceConfidence ?? "unknown",
                onChange: (e) => patch("sourceConfidence", e.target.value as Deal["sourceConfidence"]),
                children: <>
                  <option value="high">high</option><option value="medium">medium</option>
                  <option value="low">low</option><option value="unknown">unknown</option>
                </>,
              })}
            </label>
          </fieldset>

          <label>Cancellation notes{inp({ value: form.cancellationNotes ?? "", onChange: (e) => patch("cancellationNotes", e.target.value) })}</label>
          <label>Admin notes{inp({ value: form.adminNotes ?? "", onChange: (e) => patch("adminNotes", e.target.value) })}</label>
          <label>Flagged reason{inp({ value: form.flaggedReason ?? "", onChange: (e) => patch("flaggedReason", e.target.value || undefined) })}</label>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background">Save changes</button>
            <button type="button" onClick={() => { save({ status: "draft" }); alert("Saved as draft."); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Save as draft</button>
            <button type="button" onClick={() => { save({ status: "active" }); alert("Marked active."); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Mark active</button>
            <button type="button" onClick={() => nav({ to: "/admin" })} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Done</button>
          </div>
        </form>

        {/* Admin action sidebar */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Readiness</div>
            <div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${readinessColorClass(readiness.state)}`}>
              {readinessLabel(readiness.state)}
            </div>
            {readiness.missing.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Missing</div>
                <ul className="mt-1 list-disc pl-4 text-xs text-destructive">{readiness.missing.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            )}
            {readiness.warnings.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Warnings</div>
                <ul className="mt-1 list-disc pl-4 text-xs text-[var(--warning)]">{readiness.warnings.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Admin actions</div>
            <button onClick={() => { const next = markVerifiedToday(form); save(next); }} className="w-full rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">Mark verified today</button>
            <button onClick={() => { const next = recalculateScore(form); save(next); }} className="w-full rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">Recalculate Azulva Score</button>
            <button onClick={addSnapshotNow} className="w-full rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">Add price snapshot</button>
            {form.status !== "flagged" ? (
              <button onClick={() => { const r = prompt("Flag reason?"); if (r !== null) save(flagDeal(form, r)); }} className="w-full rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-[var(--warning)]/15">Flag</button>
            ) : (
              <button onClick={() => save(unflagDeal(form))} className="w-full rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">Unflag</button>
            )}
            {form.status !== "expired" ? (
              <button onClick={() => save(expireDeal(form))} className="w-full rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">Expire</button>
            ) : (
              <button onClick={() => save(restoreDeal(form))} className="w-full rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">Restore</button>
            )}
            <button
              onClick={() => {
                save({ status: "expired", adminNotes: [form.adminNotes, `Archived ${new Date().toISOString()}`].filter(Boolean).join("\n") });
                alert("Archived (set to expired with archive note).");
              }}
              className="w-full rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >Archive</button>
            <button
              onClick={() => { if (confirm("Delete deal permanently?")) { storeActions.deleteCustomDeal(form.id); nav({ to: "/admin" }); } }}
              className="w-full rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >Delete</button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
