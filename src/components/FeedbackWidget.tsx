// Floating feedback widget — collects lightweight feedback from public/demo users.
import { useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { submitFeedback, FEEDBACK_TYPES, type FeedbackType } from "@/lib/feedback";

export function FeedbackWidget({ userId, email: defaultEmail }: { userId?: string | null; email?: string | null } = {}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setBusy(true); setErr(null);
    const res = await submitFeedback({
      feedbackType: type,
      message,
      email: email || null,
      userId: userId ?? null,
      page: typeof window !== "undefined" ? window.location.pathname : null,
    });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "Couldn't send feedback."); return; }
    setDone(true);
    setMessage("");
    setTimeout(() => { setDone(false); setOpen(false); }, 1800);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-background shadow-lg md:bottom-6"
        aria-label="Give feedback"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" /> Feedback
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg">Tell us what you think</h3>
                <p className="text-xs text-muted-foreground">Ideas, bugs, or deal requests welcome.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            {done ? (
              <div className="rounded-lg bg-[var(--success)]/10 px-3 py-3 text-sm text-[var(--success)]">Thanks — we got it.</div>
            ) : (
              <div className="space-y-3">
                <select value={type} onChange={(e) => setType(e.target.value as FeedbackType)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  {FEEDBACK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <textarea
                  value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                  placeholder="What's on your mind?"
                  maxLength={2000}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional, for follow-up)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                {err && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}
                <button
                  onClick={send}
                  disabled={busy || !message.trim()}
                  className="w-full rounded-lg bg-foreground py-2 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send feedback"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
