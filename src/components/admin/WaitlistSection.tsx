// Admin Waitlist + Feedback sections. Reads via admin-scoped helpers,
// gated by AdminGuard + RLS policies (has_admin_role('viewer')).
import { useEffect, useState, useMemo } from "react";
import {
  loadWaitlist,
  loadFeedback,
  updateWaitlistStatus,
  updateWaitlistNote,
  deleteWaitlist,
  computeWaitlistAnalytics,
  toCsv,
  type WaitlistRow,
  type FeedbackRow,
} from "@/lib/admin/waitlistOps";
import { referralUrl } from "@/lib/waitlist";

const STATUSES = ["new", "invited", "converted", "rejected"] as const;

function Stat({ label, v }: { label: string; v: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{v}</div>
    </div>
  );
}

export function WaitlistSection() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  async function reload() {
    setLoading(true);
    setRows(await loadWaitlist(500));
    setLoading(false);
  }
  useEffect(() => { reload(); }, []);

  const analytics = useMemo(() => computeWaitlistAnalytics(rows), [rows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.email.toLowerCase().includes(q) ||
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.referral_code ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  const completed = rows.filter(
    (r) => r.home_airport || r.trip_type || (r.preferred_destinations?.length ?? 0) > 0,
  ).length;
  const counts = {
    total: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    invited: rows.filter((r) => r.status === "invited").length,
    converted: rows.filter((r) => r.status === "converted").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };

  function downloadCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `azulva-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function changeStatus(id: string, status: string) {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const res = await updateWaitlistStatus(id, status);
    if (!res.ok) { setRows(prev); alert(res.error ?? "Failed"); }
  }
  async function saveNote(id: string, note: string) {
    const res = await updateWaitlistNote(id, note);
    if (!res.ok) alert(res.error ?? "Failed");
  }
  async function remove(id: string) {
    if (!confirm("Delete this waitlist signup?")) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const res = await deleteWaitlist(id);
    if (!res.ok) { setRows(prev); alert(res.error ?? "Failed"); }
  }
  function copyRef(code: string) {
    navigator.clipboard?.writeText(referralUrl(code));
  }

  return (
    <section id="waitlist" className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl">Waitlist</h2>
        <div className="flex items-center gap-2">
          <button onClick={reload} className="rounded-full border border-border px-3 py-1.5 text-xs">Refresh</button>
          <button onClick={downloadCsv} className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background">Export CSV</button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total" v={counts.total} />
        <Stat label="New" v={counts.new} />
        <Stat label="Invited" v={counts.invited} />
        <Stat label="Converted" v={counts.converted} />
        <Stat label="Rejected" v={counts.rejected} />
        <Stat label="Completed survey" v={completed} />
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Top airports</div>
          {analytics.topAirports.length === 0 ? (
            <div className="text-xs text-muted-foreground">No data</div>
          ) : (
            <ul className="space-y-0.5 text-xs">
              {analytics.topAirports.slice(0, 5).map((r) => (
                <li key={r.label} className="flex justify-between"><span>{r.label}</span><span className="text-muted-foreground">{r.count}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Top destinations</div>
          {analytics.topDestinations.length === 0 ? (
            <div className="text-xs text-muted-foreground">No data</div>
          ) : (
            <ul className="space-y-0.5 text-xs">
              {analytics.topDestinations.slice(0, 5).map((r) => (
                <li key={r.label} className="flex justify-between"><span>{r.label}</span><span className="text-muted-foreground">{r.count}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Top referrers</div>
          {analytics.topReferrers.length === 0 ? (
            <div className="text-xs text-muted-foreground">No referral data yet</div>
          ) : (
            <ul className="space-y-0.5 text-xs">
              {analytics.topReferrers.slice(0, 5).map((r) => (
                <li key={r.label} className="flex justify-between"><span className="truncate">{r.label}</span><span className="text-muted-foreground">{r.count}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email, name, code…"
          className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-2 py-1 text-xs"
        />
        <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">No signups yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-2">Email / name</th>
                <th className="py-2 pr-2">Survey</th>
                <th className="py-2 pr-2">Ref code</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Created</th>
                <th className="py-2 pr-2">Note</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border align-top">
                  <td className="py-2 pr-2">
                    <div className="font-medium">{r.email}</div>
                    {r.name && <div className="text-muted-foreground">{r.name}</div>}
                    {r.referred_by && <div className="text-[10px] text-muted-foreground">via {r.referred_by}</div>}
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">
                    {r.home_airport && <div>{r.home_airport}</div>}
                    {r.trip_type && <div>{r.trip_type}</div>}
                    {r.max_budget_per_person && <div>${r.max_budget_per_person}/pp</div>}
                    {r.group_size && <div>{r.group_size} ppl</div>}
                    {(r.preferred_destinations?.length ?? 0) > 0 && (
                      <div className="text-[10px]">{r.preferred_destinations!.slice(0, 3).join(", ")}</div>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {r.referral_code ? (
                      <button
                        onClick={() => copyRef(r.referral_code!)}
                        className="rounded border border-border px-1.5 py-0.5 font-mono"
                        title="Copy referral link"
                      >
                        {r.referral_code}
                      </button>
                    ) : "—"}
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={r.status}
                      onChange={(e) => changeStatus(r.id, e.target.value)}
                      className="rounded border border-border bg-background px-1 py-0.5"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      {!STATUSES.includes(r.status as typeof STATUSES[number]) && (
                        <option value={r.status}>{r.status}</option>
                      )}
                    </select>
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground" suppressHydrationWarning>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      defaultValue={r.admin_note ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (r.admin_note ?? "")) saveNote(r.id, e.target.value);
                      }}
                      placeholder="Note…"
                      className="w-32 rounded border border-border bg-background px-1 py-0.5"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <button
                      onClick={() => remove(r.id)}
                      className="rounded border border-destructive/40 px-1.5 py-0.5 text-destructive"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function FeedbackSection() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    setRows(await loadFeedback(200));
    setLoading(false);
  }
  useEffect(() => { reload(); }, []);

  return (
    <section id="feedback" className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl">Feedback</h2>
        <button onClick={reload} className="rounded-full border border-border px-3 py-1.5 text-xs">Refresh</button>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">No feedback yet.</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5 font-semibold uppercase">{r.feedback_type}</span>
                {r.page && <span>· {r.page}</span>}
                {r.email && <span>· {r.email}</span>}
                {r.rating != null && <span>· ★ {r.rating}</span>}
                <span className="ml-auto" suppressHydrationWarning>
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap">{r.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
