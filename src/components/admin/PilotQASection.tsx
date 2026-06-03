// Pilot Launch QA checklist, Pilot Readiness panel, and First Deal Pack guidance.
// Admin-only; persists checklist items in pilot_qa_checks (RLS gated).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Deal } from "@/lib/types";
import type { AppSettings } from "@/lib/admin/appSettings";

type Status = "not_checked" | "passed" | "failed" | "needs_review";

type Item = { key: string; area: string; label: string };

const CHECKLIST: Item[] = [
  // Public / signed-out
  { area: "Public", key: "pub_landing_loads", label: "Landing page loads" },
  { area: "Public", key: "pub_waitlist_submit", label: "Waitlist form submits" },
  { area: "Public", key: "pub_survey_submit", label: "Optional survey submits" },
  { area: "Public", key: "pub_referral_shown", label: "Referral link appears after signup" },
  { area: "Public", key: "pub_referral_copy", label: "Referral link can be copied" },
  { area: "Public", key: "pub_feedback_submit", label: "Feedback widget submits" },
  { area: "Public", key: "pub_footer_links", label: "Footer links work" },
  { area: "Public", key: "pub_mobile_layout", label: "Mobile layout works" },
  // Auth
  { area: "Auth", key: "auth_email_signup", label: "Email signup works" },
  { area: "Auth", key: "auth_email_login", label: "Email login works" },
  { area: "Auth", key: "auth_google_login", label: "Google login works" },
  { area: "Auth", key: "auth_signout", label: "Sign-out works" },
  { area: "Auth", key: "auth_password_reset", label: "Password reset works" },
  { area: "Auth", key: "auth_signed_out_landing", label: "Signed-out users see landing page" },
  { area: "Auth", key: "auth_signed_in_feed", label: "Signed-in users see deal feed" },
  // User planning
  { area: "Planning", key: "plan_save_deal", label: "Save/unsave deal" },
  { area: "Planning", key: "plan_save_destination", label: "Save/unsave destination" },
  { area: "Planning", key: "plan_escape_board", label: "Escape Board loads" },
  { area: "Planning", key: "plan_compare", label: "Destination compare works" },
  { area: "Planning", key: "plan_create_watch", label: "Create Deal Watch" },
  { area: "Planning", key: "plan_watch_persist", label: "Watchlist persists after refresh" },
  { area: "Planning", key: "plan_profile_save", label: "Profile preferences save" },
  // Trip Rooms
  { area: "TripRooms", key: "tr_create", label: "Create Trip Room" },
  { area: "TripRooms", key: "tr_join_code", label: "Join Trip Room by invite code" },
  { area: "TripRooms", key: "tr_add_destination", label: "Add destination to room" },
  { area: "TripRooms", key: "tr_vote_destination", label: "Vote on destination" },
  { area: "TripRooms", key: "tr_add_deal", label: "Add deal to room" },
  { area: "TripRooms", key: "tr_vote_deal", label: "Vote on deal" },
  { area: "TripRooms", key: "tr_group_fit", label: "Group Fit Score appears" },
  { area: "TripRooms", key: "tr_member_prefs", label: "Member preferences save" },
  { area: "TripRooms", key: "tr_persist", label: "Room persists after refresh" },
  // Deals
  { area: "Deals", key: "deal_feed", label: "Deal feed loads" },
  { area: "Deals", key: "deal_detail", label: "Deal detail loads" },
  { area: "Deals", key: "deal_verification", label: "Deal verification block appears" },
  { area: "Deals", key: "deal_price_chart", label: "Price chart appears when snapshots exist" },
  { area: "Deals", key: "deal_outbound_track", label: "View Deal button tracks outbound click" },
  { area: "Deals", key: "deal_sample_hidden", label: "Sample deals hidden in production mode if configured" },
  // Admin
  { area: "Admin", key: "admin_guard", label: "AdminGuard blocks non-admins" },
  { area: "Admin", key: "admin_dashboard", label: "Admin dashboard loads" },
  { area: "Admin", key: "admin_csv_import", label: "Import CSV works" },
  { area: "Admin", key: "admin_deal_edit", label: "Deal edit works" },
  { area: "Admin", key: "admin_mark_verified", label: "Mark verified works" },
  { area: "Admin", key: "admin_add_snapshot", label: "Add snapshot works" },
  { area: "Admin", key: "admin_archive_restore", label: "Archive/expire/restore works" },
  { area: "Admin", key: "admin_audit_log", label: "Audit log records actions" },
  { area: "Admin", key: "admin_waitlist", label: "Waitlist section loads" },
  { area: "Admin", key: "admin_feedback", label: "Feedback section loads" },
  { area: "Admin", key: "admin_app_settings", label: "App settings load" },
  { area: "Admin", key: "admin_launch_readiness", label: "Launch readiness panel loads" },
];

const STATUS_OPTIONS: Status[] = ["not_checked", "passed", "failed", "needs_review"];

const TEST_SCRIPT = [
  "Join the waitlist.",
  "Create an account.",
  "Set your home airport and budget.",
  "Save 2 destinations.",
  "Compare destinations.",
  "Save 2 deals.",
  "Create a Trip Room.",
  "Invite a friend.",
  "Vote on a destination.",
  "Vote on a deal.",
  "Submit feedback.",
];

type Row = { check_key: string; status: Status; notes: string | null; updated_at: string };

function statusColor(s: Status) {
  switch (s) {
    case "passed": return "bg-[var(--success)]/15 text-[var(--success)]";
    case "failed": return "bg-destructive/15 text-destructive";
    case "needs_review": return "bg-[var(--warning)]/15 text-[var(--warning)]";
    default: return "bg-muted text-muted-foreground";
  }
}

export function PilotQASection() {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("pilot_qa_checks").select("check_key,status,notes,updated_at");
    const map: Record<string, Row> = {};
    (data ?? []).forEach((r) => {
      map[r.check_key] = { check_key: r.check_key, status: (r.status as Status) ?? "not_checked", notes: r.notes ?? null, updated_at: r.updated_at };
    });
    setRows(map);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function update(item: Item, patch: { status?: Status; notes?: string | null }) {
    setSavingKey(item.key);
    const { data: u } = await supabase.auth.getUser();
    const current = rows[item.key];
    const next = {
      check_key: item.key,
      area: item.area,
      label: item.label,
      status: patch.status ?? current?.status ?? "not_checked",
      notes: patch.notes !== undefined ? patch.notes : current?.notes ?? null,
      updated_by: u.user?.id ?? null,
    };
    const { error } = await supabase.from("pilot_qa_checks").upsert(next, { onConflict: "check_key" });
    setSavingKey(null);
    if (error) { alert(error.message); return; }
    setRows((prev) => ({ ...prev, [item.key]: { ...next, updated_at: new Date().toISOString(), notes: next.notes } }));
  }

  const summary = useMemo(() => {
    const counts: Record<Status, number> = { not_checked: 0, passed: 0, failed: 0, needs_review: 0 };
    for (const it of CHECKLIST) {
      const s = rows[it.key]?.status ?? "not_checked";
      counts[s]++;
    }
    return counts;
  }, [rows]);

  const grouped = useMemo(() => {
    const g: Record<string, Item[]> = {};
    for (const i of CHECKLIST) (g[i.area] ??= []).push(i);
    return g;
  }, []);

  return (
    <section id="pilot-qa" className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl">Pilot Launch QA</h2>
        <div className="flex gap-1 text-[10px] font-semibold uppercase">
          <span className={`rounded-full px-2 py-0.5 ${statusColor("passed")}`}>Passed {summary.passed}</span>
          <span className={`rounded-full px-2 py-0.5 ${statusColor("needs_review")}`}>Review {summary.needs_review}</span>
          <span className={`rounded-full px-2 py-0.5 ${statusColor("failed")}`}>Failed {summary.failed}</span>
          <span className={`rounded-full px-2 py-0.5 ${statusColor("not_checked")}`}>Unchecked {summary.not_checked}</span>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading checklist…</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([area, items]) => (
            <div key={area}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{area}</h3>
              <ul className="space-y-1.5 text-sm">
                {items.map((it) => {
                  const row = rows[it.key];
                  const status: Status = row?.status ?? "not_checked";
                  return (
                    <li key={it.key} className="rounded-lg border border-border p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex-1">{it.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor(status)}`}>{status.replace("_", " ")}</span>
                        <select
                          disabled={savingKey === it.key}
                          value={status}
                          onChange={(e) => update(it, { status: e.target.value as Status })}
                          className="rounded border border-border bg-background px-1.5 py-1 text-xs"
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                        </select>
                      </div>
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        defaultValue={row?.notes ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if ((row?.notes ?? "") !== v) update(it, { notes: v || null });
                        }}
                        className="mt-1.5 w-full rounded border border-border bg-background px-2 py-1 text-xs"
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs">
        <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">Pilot user test script</div>
        <ol className="list-decimal space-y-0.5 pl-5">
          {TEST_SCRIPT.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function PilotReadinessPanel({ deals, settings }: { deals: Deal[]; settings: AppSettings }) {
  const active = deals.filter((d) => d.status === "active");
  type Check = { label: string; state: "ready" | "needs_review" | "blocking"; detail?: string };
  const verifiedRecently = (d: Deal) => {
    const t = d.lastCheckedAt ? new Date(d.lastCheckedAt).getTime() : 0;
    return t > 0 && Date.now() - t < 1000 * 60 * 60 * 24 * 30;
  };
  const checks: Check[] = [
    { label: `App mode confirmed (${settings.app_mode})`, state: "ready" },
    {
      label: "Sample deals hidden or clearly labeled",
      state: settings.app_mode === "production" && settings.show_sample_deals ? "needs_review" : "ready",
    },
    {
      label: "At least 10 active curated deals exist",
      state: active.length >= 10 ? "ready" : "blocking",
      detail: `${active.length}`,
    },
    {
      label: "Every active deal has a source URL",
      state: active.every((d) => !!d.sourceUrl) ? "ready" : "blocking",
      detail: `${active.filter((d) => !d.sourceUrl).length} missing`,
    },
    {
      label: "Every active deal has a verification date (≤30d)",
      state: active.every(verifiedRecently) ? "ready" : "needs_review",
      detail: `${active.filter((d) => !verifiedRecently(d)).length} stale`,
    },
    {
      label: "Every active deal has a destination",
      state: active.every((d) => !!d.destinationId) ? "ready" : "blocking",
      detail: `${active.filter((d) => !d.destinationId).length} missing`,
    },
    {
      label: "Every active deal has price + currency",
      state: active.every((d) => d.pricePerPerson > 0 && !!d.currencyCode) ? "ready" : "blocking",
      detail: `${active.filter((d) => !(d.pricePerPerson > 0 && d.currencyCode)).length} missing`,
    },
    {
      label: "Every active deal has all-inclusive confidence set",
      state: active.every((d) => d.allInclusiveConfidence && d.allInclusiveConfidence !== "Unknown") ? "ready" : "needs_review",
      detail: `${active.filter((d) => !d.allInclusiveConfidence || d.allInclusiveConfidence === "Unknown").length} unclear`,
    },
    { label: "Affiliate disclosure enabled", state: settings.affiliate_disclosure_enabled ? "ready" : "blocking" },
    { label: "Verification notice enabled", state: settings.verification_notice_enabled ? "ready" : "needs_review" },
  ];
  const color = (s: Check["state"]) =>
    s === "ready" ? "bg-[var(--success)]/15 text-[var(--success)]"
    : s === "needs_review" ? "bg-[var(--warning)]/15 text-[var(--warning)]"
    : "bg-destructive/15 text-destructive";
  return (
    <section id="pilot-readiness" className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-xl mb-3">Pilot Launch Readiness</h2>
      <p className="mb-3 text-xs text-muted-foreground">Guidance only — does not block app usage.</p>
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

// ---------------------------------------------------------------------------

export function FirstDealPackSection({ deals }: { deals: Deal[] }) {
  const active = deals.filter((d) => d.status === "active" && d.sourceLabel !== "Sample Deal");
  const day = 1000 * 60 * 60 * 24;
  const verifiedLast24 = active.filter((d) => d.lastCheckedAt && Date.now() - new Date(d.lastCheckedAt).getTime() < day);
  const withSnapshots = active.filter((d) => (d.totalPriceEstimate ?? 0) > 0 || !!d.pricePerPerson); // surrogate; real count would need a join
  const missingOutbound = active.filter((d) => !d.affiliateUrl && !d.generatedAffiliateUrl && !d.sourceUrl);
  const missingDestination = active.filter((d) => !d.destinationId);
  const unclearAi = active.filter((d) => d.allInclusiveConfidence === "Unclear" || d.allInclusiveConfidence === "Unknown");

  return (
    <section id="first-deal-pack" className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-xl mb-3">First Deal Pack</h2>
      <p className="mb-3 text-xs text-muted-foreground">Guidance for assembling the first 10–20 real curated deals for the pilot.</p>
      <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
        <li>Add 10–20 real curated deals manually or through CSV import.</li>
        <li>Use trusted sources only.</li>
        <li>Add a source URL for every deal.</li>
        <li>Add an affiliate URL only if approved/available.</li>
        <li>Mark each deal verified today after checking the source.</li>
        <li>Add at least one price snapshot for every real deal.</li>
        <li>Use a clear all-inclusive confidence level.</li>
        <li>Avoid showing expired or vague deals.</li>
        <li>Keep sample deals hidden in production mode.</li>
      </ul>
      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label="Active real deals" v={active.length} />
        <Stat label="Verified last 24h" v={verifiedLast24.length} />
        <Stat label="With price set" v={withSnapshots.length} />
        <Stat label="Missing outbound URL" v={missingOutbound.length} warn={missingOutbound.length > 0} />
        <Stat label="Missing destination" v={missingDestination.length} warn={missingDestination.length > 0} />
        <Stat label="Unclear all-inclusive" v={unclearAi.length} warn={unclearAi.length > 0} />
      </div>
    </section>
  );
}

function Stat({ label, v, warn }: { label: string; v: number; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${warn ? "border-[var(--warning)]/40 bg-[var(--warning)]/10" : "border-border bg-muted/30"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold">{v}</div>
    </div>
  );
}
