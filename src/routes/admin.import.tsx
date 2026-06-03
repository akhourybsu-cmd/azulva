import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { storeActions, useStore, getCurrentUserId } from "@/lib/store";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadDealSources, type DealSourceRow } from "@/lib/admin/dealSources";
import { addSnapshot } from "@/lib/admin/priceSnapshots";
import {
  parseCsv, validateRow, rowToDeal, buildCsvTemplate,
  dealsAreLikelyDuplicate,
  type CsvRow, type RowValidation,
} from "@/lib/admin/csvImport";
import { mockResorts } from "@/lib/data/mockResorts";
import type { Deal } from "@/lib/types";
import {
  createImportBatch, recordBatchRows, loadRecentBatches,
  type ImportBatchRow, type ImportBatchRowEntry,
} from "@/lib/admin/importBatches";
import { logAudit } from "@/lib/admin/auditLog";

export const Route = createFileRoute("/admin/import")({
  component: () => <AdminGuard><ImportPage /></AdminGuard>,
});

type ImportMode = "draft" | "active" | "verified_today";

function ImportPage() {
  const s = useStore();
  const [sources, setSources] = useState<DealSourceRow[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [validations, setValidations] = useState<RowValidation[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [mode, setMode] = useState<ImportMode>("draft");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number; duplicates: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<ImportBatchRow[]>([]);

  useEffect(() => {
    loadDealSources().then(setSources);
    loadRecentBatches().then(setHistory);
  }, []);

  const existing = useMemo(() => s.customDeals, [s.customDeals]);

  function handleFile(f: File) {
    setFileName(f.name);
    setResult(null);
    f.text().then((text) => {
      const { rows, errors } = parseCsv(text);
      setRows(rows);
      setParseErrors(errors);
      setValidations(rows.map((r) => validateRow(r, sources)));
    });
  }

  function downloadTemplate() {
    const blob = new Blob([buildCsvTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "azulva-deals-template.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  async function importAll() {
    if (rows.length === 0) return;
    const uid = getCurrentUserId();
    let imported = 0, skipped = 0, duplicates = 0, errors = 0;
    const created: Deal[] = [];
    const batchRows: ImportBatchRowEntry[] = [];
    for (let i = 0; i < rows.length; i++) {
      const v = validations[i];
      if (v.level === "error") {
        errors++;
        batchRows.push({ row_number: i + 1, status: "error", message: v.missing.join(", "), raw_data: rows[i] });
        continue;
      }
      const draft = rowToDeal(rows[i], v);
      if (mode === "active") draft.status = "active";
      else if (mode === "draft") draft.status = "draft";
      else if (mode === "verified_today") {
        draft.status = "active";
        draft.lastCheckedAt = new Date().toISOString();
      }
      const dup = existing.some((e) => dealsAreLikelyDuplicate(e, draft))
        || created.some((e) => dealsAreLikelyDuplicate(e, draft));
      if (dup) {
        duplicates++; skipped++;
        batchRows.push({ row_number: i + 1, status: "duplicate", message: "Likely duplicate of existing deal", raw_data: rows[i] });
        continue;
      }
      storeActions.addCustomDeal(draft);
      created.push(draft);
      imported++;
      batchRows.push({
        row_number: i + 1,
        status: v.level === "warn" ? "warning" : "ok",
        message: v.warnings.join("; ") || null,
        raw_data: rows[i],
        created_deal_id: draft.id,
      });
      if (uid && draft.pricePerPerson > 0) {
        await addSnapshot({
          dealId: draft.id, pricePerPerson: draft.pricePerPerson,
          currency: draft.currencyCode, sourceId: draft.sourceId ?? null,
          resortName: mockResorts.find((r) => r.id === draft.resortId)?.name ?? null,
          departureAirport: draft.departureAirport,
          startDate: draft.startDate, endDate: draft.endDate, nights: draft.nights,
          sourceUrl: draft.sourceUrl, notes: "Initial CSV import snapshot",
          capturedByUser: uid,
        }).catch(() => {});
      }
    }
    setResult({ imported, skipped, duplicates, errors });
    // Persist import batch + per-row history
    const warnCountLocal = validations.filter((v) => v.level === "warn").length;
    const batchRes = await createImportBatch({
      filename: fileName,
      mode,
      totalRows: rows.length,
      imported,
      warnings: warnCountLocal,
      errors,
      duplicates,
      status: "completed",
      summary: { ok: imported, errors, duplicates, warnings: warnCountLocal },
    });
    if (batchRes.ok) {
      await recordBatchRows(batchRes.id, batchRows).catch(() => {});
      await logAudit({ action: "import_csv_batch", entityType: "import_batch", entityId: batchRes.id, after: { filename: fileName, imported, errors, duplicates } });
      loadRecentBatches().then(setHistory);
    }
    setRows([]); setValidations([]); setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const errorCount = validations.filter((v) => v.level === "error").length;
  const warnCount = validations.filter((v) => v.level === "warn").length;
  const okCount = validations.filter((v) => v.level === "ok").length;

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin" className="text-xs text-muted-foreground hover:underline">← Admin</Link>
          <h1 className="font-display text-3xl">Import curated deals</h1>
          <p className="text-sm text-muted-foreground">Bulk import deals from a CSV. Preview rows before publishing.</p>
        </div>
        <button onClick={downloadTemplate} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Download CSV template
        </button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="text-sm"
          />
          {fileName && <span className="text-xs text-muted-foreground">{fileName} · {rows.length} rows</span>}
        </div>

        {parseErrors.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-xs text-[var(--warning)]">
            {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}

        {rows.length > 0 && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-full bg-[var(--success)]/15 px-2 py-0.5 text-[var(--success)]">{okCount} ready</span>
              <span className="rounded-full bg-[var(--warning)]/15 px-2 py-0.5 text-[var(--warning)]">{warnCount} warnings</span>
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-destructive">{errorCount} errors</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <label>Import as
                <select value={mode} onChange={(e) => setMode(e.target.value as ImportMode)} className="ml-2 rounded-lg border border-border bg-background px-2 py-1 text-sm">
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="verified_today">active + verified today</option>
                </select>
              </label>
              <button onClick={importAll} disabled={errorCount === rows.length} className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background disabled:opacity-50">
                Import {rows.length - errorCount} deals
              </button>
            </div>

            <div className="mt-4 max-h-[480px] overflow-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5">#</th>
                    <th className="px-2 py-1.5">Status</th>
                    <th className="px-2 py-1.5">Title</th>
                    <th className="px-2 py-1.5">Resort</th>
                    <th className="px-2 py-1.5">Dest</th>
                    <th className="px-2 py-1.5">Dates</th>
                    <th className="px-2 py-1.5">Price</th>
                    <th className="px-2 py-1.5">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const v = validations[i];
                    const color = v.level === "ok" ? "text-[var(--success)]" : v.level === "warn" ? "text-[var(--warning)]" : "text-destructive";
                    return (
                      <tr key={i} className="border-t border-border align-top">
                        <td className="px-2 py-1.5">{i + 1}</td>
                        <td className={`px-2 py-1.5 font-semibold ${color}`}>{v.level}</td>
                        <td className="px-2 py-1.5">{r.title || <span className="text-muted-foreground">(auto)</span>}</td>
                        <td className="px-2 py-1.5">{r.resort_name}</td>
                        <td className="px-2 py-1.5">{r.destination || r.destination_slug}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.start_date} → {r.end_date}</td>
                        <td className="px-2 py-1.5">{r.price_per_person} {r.currency}</td>
                        <td className="px-2 py-1.5">
                          {v.missing.length > 0 && <div className="text-destructive">Missing: {v.missing.join(", ")}</div>}
                          {v.warnings.length > 0 && <div className="text-[var(--warning)]">{v.warnings.join("; ")}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {result && (
          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <strong>Import complete.</strong> {result.imported} imported · {result.duplicates} duplicates skipped · {result.errors} errors.
            <Link to="/admin" className="ml-2 text-xs underline">Back to admin</Link>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-xl mb-3">Import history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prior imports recorded.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-1.5">When</th>
                  <th>File</th>
                  <th>Mode</th>
                  <th>Total</th>
                  <th>Imported</th>
                  <th>Dupes</th>
                  <th>Errors</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="py-1.5" suppressHydrationWarning>{new Date(b.created_at).toLocaleString()}</td>
                    <td>{b.filename ?? "—"}</td>
                    <td>{b.mode}</td>
                    <td>{b.total_rows}</td>
                    <td>{b.imported_count}</td>
                    <td>{b.duplicate_count}</td>
                    <td>{b.error_count}</td>
                    <td>{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
