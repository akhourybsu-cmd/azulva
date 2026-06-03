import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password · Azulva" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase recovery links trigger a PASSWORD_RECOVERY event after parsing the URL.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // If user is already in a recovery session (e.g. soft refresh), allow update too.
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo("Password updated. Redirecting you in…");
      setTimeout(() => navigate({ to: "/" }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally { setBusy(false); }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md py-6">
        <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ready ? "Pick something memorable but strong." : "Waiting for your reset link to be verified…"}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input type="password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
          {info && <div className="rounded-md bg-[var(--success)]/10 px-3 py-2 text-xs text-[var(--success)]">{info}</div>}
          <button disabled={busy || !ready} className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="underline">Back to sign in</Link>
        </p>
      </div>
    </AppShell>
  );
}
