// Guards admin-only UI. Server-side RLS still enforces access — this is UX.
import { Link } from "@tanstack/react-router";
import { useAdminStatus } from "@/lib/admin/adminRole";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const a = useAdminStatus();

  if (a.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking admin access…
      </div>
    );
  }
  if (!a.signedIn) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-[var(--warning)]" />
        <h1 className="mt-2 font-display text-2xl">Sign-in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need to sign in to view the Azulva admin area.
        </p>
        <Link
          to="/auth"
          className="mt-4 inline-block rounded-full bg-foreground px-4 py-2 text-sm text-background"
        >
          Sign in
        </Link>
      </div>
    );
  }
  if (!a.isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <h1 className="mt-2 font-display text-2xl">No access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have access to this area. Ask an Azulva owner to grant you an
          admin or editor role.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-full border border-border px-4 py-2 text-sm"
        >
          Back to Azulva
        </Link>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--success)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--success)]">
        <ShieldCheck className="h-3 w-3" /> Admin · {a.role}
      </div>
      {children}
    </div>
  );
}
