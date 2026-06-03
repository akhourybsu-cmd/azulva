// Admin role status hook. Reads from `admin_users` (RLS scoped to auth.uid()).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminRole = "owner" | "admin" | "editor" | "viewer";

export interface AdminStatus {
  loading: boolean;
  signedIn: boolean;
  role: AdminRole | null;
  /** Has any role that can edit (owner/admin/editor). */
  isAdmin: boolean;
  /** Has destructive privileges (owner/admin). */
  canDelete: boolean;
  error?: string;
}

export function useAdminStatus(): AdminStatus {
  const [s, setS] = useState<AdminStatus>({
    loading: true, signedIn: false, role: null, isAdmin: false, canDelete: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!u.user) {
        setS({ loading: false, signedIn: false, role: null, isAdmin: false, canDelete: false });
        return;
      }
      const { data, error } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (cancelled) return;
      const role = (data?.role as AdminRole | undefined) ?? null;
      setS({
        loading: false,
        signedIn: true,
        role,
        isAdmin: role === "owner" || role === "admin" || role === "editor",
        canDelete: role === "owner" || role === "admin",
        error: error?.message,
      });
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return s;
}
