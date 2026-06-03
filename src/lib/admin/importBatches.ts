// Persistent CSV import batch history.
import { supabase } from "@/integrations/supabase/client";

export interface ImportBatchRow {
  id: string;
  uploaded_by: string | null;
  filename: string | null;
  mode: string;
  total_rows: number;
  imported_count: number;
  warning_count: number;
  error_count: number;
  duplicate_count: number;
  status: string;
  summary: Record<string, unknown>;
  created_at: string;
}

export interface ImportBatchRowEntry {
  row_number: number;
  status: "ok" | "warning" | "error" | "duplicate";
  message?: string | null;
  raw_data?: unknown;
  created_deal_id?: string | null;
}

export async function createImportBatch(input: {
  filename: string | null;
  mode: string;
  totalRows: number;
  imported: number;
  warnings: number;
  errors: number;
  duplicates: number;
  status: "previewed" | "completed" | "failed";
  summary?: Record<string, unknown>;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("import_batches")
    .insert({
      uploaded_by: u.user?.id ?? null,
      filename: input.filename,
      mode: input.mode,
      total_rows: input.totalRows,
      imported_count: input.imported,
      warning_count: input.warnings,
      error_count: input.errors,
      duplicate_count: input.duplicates,
      status: input.status,
      summary: (input.summary ?? {}) as never,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "insert failed" };
  return { ok: true, id: data.id };
}

export async function recordBatchRows(batchId: string, rows: ImportBatchRowEntry[]) {
  if (rows.length === 0) return;
  await supabase.from("import_batch_rows").insert(
    rows.map((r) => ({
      batch_id: batchId,
      row_number: r.row_number,
      status: r.status,
      message: r.message ?? null,
      raw_data: (r.raw_data ?? null) as never,
      created_deal_id: r.created_deal_id ?? null,
    })),
  );
}

export async function loadRecentBatches(limit = 20): Promise<ImportBatchRow[]> {
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as unknown as ImportBatchRow[];
}
