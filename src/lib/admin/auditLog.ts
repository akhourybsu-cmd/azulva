// Admin audit log helpers.
import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "create_deal" | "edit_deal" | "duplicate_deal" | "delete_deal"
  | "archive_deal" | "restore_deal" | "expire_deal" | "flag_deal" | "unflag_deal"
  | "mark_verified" | "recalculate_score" | "add_snapshot"
  | "import_csv_batch" | "update_app_setting"
  | "create_deal_source" | "update_deal_source" | "delete_deal_source"
  | "toggle_deal_source" | "seed_source_playbook"
  | "generate_affiliate_link" | "regenerate_affiliate_link";

export interface AuditLogEntry {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  before_data: unknown;
  after_data: unknown;
  created_at: string;
}

export async function logAudit(params: {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("admin_audit_log").insert({
      actor_user_id: u.user.id,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      before_data: (params.before ?? null) as never,
      after_data: (params.after ?? null) as never,
    });
  } catch (e) {
    console.warn("[audit] log failed", e);
  }
}

export async function loadRecentAudit(limit = 50): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as unknown as AuditLogEntry[];
}
