import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { AzulvaLogo } from "@/components/Brand";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in · Azulva" },
    { name: "description", content: "Sign in or create an Azulva account to save deals, build watchlists, and plan trips with friends." },
  ] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && mode !== "forgot") navigate({ to: "/" });
  }, [user, navigate, mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        setInfo("Check your email to confirm your account.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("If an account exists for that email, a reset link is on its way.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setError(result.error.message);
  }

  const title =
    mode === "signup" ? "Create your Azulva account" :
    mode === "forgot" ? "Reset your password" :
    "Welcome back";

  return (
    <AppShell>
      <div className="mx-auto max-w-md py-6">
        <div className="mb-6 flex justify-center">
          <AzulvaLogo className="h-10 w-auto" />
        </div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "forgot"
            ? "Enter your email and we'll send a link to choose a new password."
            : "Save deals, get price alerts, and plan trips with friends across devices."}
        </p>

        {mode !== "forgot" && (
          <>
            <button onClick={onGoogle} className="mt-6 w-full rounded-md border border-border bg-background py-2 text-sm font-medium hover:bg-muted">
              Continue with Google
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or email <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          )}
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          {mode !== "forgot" && (
            <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          )}
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
          {info && <div className="rounded-md bg-[var(--success)]/10 px-3 py-2 text-xs text-[var(--success)]">{info}</div>}
          <button disabled={busy} className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy ? "Working…"
              : mode === "signup" ? "Create account"
              : mode === "forgot" ? "Send reset link"
              : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          <button onClick={() => { setError(null); setInfo(null); setMode(mode === "signup" ? "signin" : "signup"); }} className="hover:text-foreground">
            {mode === "signup" ? "Already have an account? Sign in" : "New to Azulva? Create an account"}
          </button>
          {mode !== "forgot" ? (
            <button onClick={() => { setError(null); setInfo(null); setMode("forgot"); }} className="hover:text-foreground">Forgot password?</button>
          ) : (
            <button onClick={() => { setError(null); setInfo(null); setMode("signin"); }} className="hover:text-foreground">Back to sign in</button>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          By continuing you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </AppShell>
  );
}
