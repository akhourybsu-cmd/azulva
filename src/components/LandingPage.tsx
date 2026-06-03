// Public landing experience: hero, features, waitlist signup, trust copy.
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AzulvaLogo, AzulvaEmblem } from "@/components/Brand";
import {
  Sparkles, Bell, Bookmark, Users, Award, Compass, ShieldCheck,
  ArrowRight, Check, Copy, Plane, MapPin, ExternalLink,
} from "lucide-react";
import { mockDestinations } from "@/lib/data/mockDestinations";
import {
  submitWaitlist, referralUrl, readReferralFromUrl,
  TRIP_TYPES, PRIORITIES,
} from "@/lib/waitlist";
import { FeedbackWidget } from "@/components/FeedbackWidget";

type Step = "form" | "questions" | "done";

export function LandingPage() {
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [referredBy, setReferredBy] = useState<string | null>(null);

  // Optional questionnaire fields
  const [airport, setAirport] = useState("");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [budget, setBudget] = useState<number | "">("");
  const [tripType, setTripType] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [wasExisting, setWasExisting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const r = readReferralFromUrl();
    if (r) setReferredBy(r);
  }, []);

  async function joinList(skipQuestions: boolean) {
    setBusy(true); setErr(null);
    const res = await submitWaitlist({
      email,
      name: name || null,
      homeAirport: skipQuestions ? null : (airport || null),
      preferredDestinations: skipQuestions ? null : (destinations.length ? destinations : null),
      maxBudgetPerPerson: skipQuestions || budget === "" ? null : Number(budget),
      tripType: skipQuestions ? null : (tripType || null),
      priorities: skipQuestions ? null : (priorities.length ? priorities : null),
      referredBy,
      source: typeof window !== "undefined" ? window.location.pathname : "landing",
    });
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "Couldn't sign up. Try again."); return; }
    setRefCode(res.referralCode ?? null);
    setWasExisting(!!res.wasExisting);
    setStep("done");
  }

  function togglePriority(p: string) {
    setPriorities((arr) => arr.includes(p) ? arr.filter((x) => x !== p) : [...arr, p]);
  }
  function toggleDestination(id: string) {
    setDestinations((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  async function copyRef() {
    if (!refCode) return;
    try {
      await navigator.clipboard.writeText(referralUrl(refCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-2" aria-label="Azulva home">
            <AzulvaLogo className="hidden h-8 w-auto md:block" />
            <span className="flex items-center gap-2 md:hidden">
              <AzulvaEmblem className="h-8 w-8" />
              <span className="font-display text-lg font-semibold">Azulva</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <a href="#waitlist" className="hidden rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90 md:inline-flex">
              Join the waitlist
            </a>
            <Link to="/auth" className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--ocean)]/95 via-[var(--ocean)] to-[var(--coral)]" />
        <div className="absolute -right-20 -top-32 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-[420px] w-[420px] rounded-full bg-[var(--sunset)]/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div className="text-primary-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Early access · all-inclusive deal radar
              </span>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">
                Find the all-inclusive trip everyone actually agrees on.
              </h1>
              <p className="mt-4 max-w-xl text-base text-white/90 md:text-lg">
                Track resort deals, compare escapes, vote with friends, and know when a beach trip is actually worth booking.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#waitlist" className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-foreground shadow-lg hover:opacity-95">
                  Join the waitlist <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#how" className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
                  See how it works
                </a>
              </div>
              <p className="mt-3 text-xs text-white/70">No account required. Free during early access.</p>
            </div>

            {/* Inline waitlist signup card */}
            <div id="waitlist" className="rounded-2xl border border-white/20 bg-white/95 p-5 text-foreground shadow-2xl backdrop-blur">
              {step !== "done" ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ocean)]">Get early access</div>
                  <h2 className="mt-1 font-display text-2xl">Join the Azulva waitlist</h2>
                  <p className="mt-1 text-sm text-muted-foreground">We'll email you when your spot opens — and when great resort deals match your trip.</p>

                  <div className="mt-4 space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                      autoComplete="email"
                      required
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name (optional)"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                    {referredBy && (
                      <div className="rounded-md bg-muted px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        Referred by <span className="font-mono font-semibold">{referredBy}</span>
                      </div>
                    )}

                    {step === "questions" && (
                      <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">A few quick questions (optional)</div>
                        <input value={airport} onChange={(e) => setAirport(e.target.value.toUpperCase().slice(0, 4))}
                          placeholder="Home airport (e.g. BOS)"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
                        <div>
                          <div className="mb-1 text-xs text-muted-foreground">Destinations you're watching</div>
                          <div className="flex flex-wrap gap-1.5">
                            {mockDestinations.slice(0, 8).map((d) => {
                              const sel = destinations.includes(d.id);
                              return (
                                <button key={d.id} type="button" onClick={() => toggleDestination(d.id)}
                                  className={"rounded-full border px-2.5 py-1 text-[11px] " + (sel ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted")}>
                                  {d.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <input type="number" value={budget} onChange={(e) => setBudget(e.target.value === "" ? "" : +e.target.value)}
                          placeholder="Max budget per person (USD)"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                        <div>
                          <div className="mb-1 text-xs text-muted-foreground">Trip type</div>
                          <select value={tripType} onChange={(e) => setTripType(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                            <option value="">Choose…</option>
                            {TRIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-muted-foreground">What matters most</div>
                          <div className="flex flex-wrap gap-1.5">
                            {PRIORITIES.map((p) => {
                              const sel = priorities.includes(p);
                              return (
                                <button key={p} type="button" onClick={() => togglePriority(p)}
                                  className={"rounded-full border px-2.5 py-1 text-[11px] " + (sel ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted")}>
                                  {p}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {err && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}

                    <div className="flex flex-wrap gap-2">
                      {step === "form" ? (
                        <>
                          <button
                            type="button"
                            disabled={busy || !email}
                            onClick={() => setStep("questions")}
                            className="flex-1 rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-60"
                          >
                            Continue
                          </button>
                          <button
                            type="button"
                            disabled={busy || !email}
                            onClick={() => joinList(true)}
                            className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-60"
                          >
                            Skip & join
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => joinList(false)}
                            className="flex-1 rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-60"
                          >
                            {busy ? "Joining…" : "Join the waitlist"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => joinList(true)}
                            className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-60"
                          >
                            Skip questions
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <SuccessState
                  refCode={refCode}
                  wasExisting={wasExisting}
                  onCopy={copyRef}
                  copied={copied}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
        <div className="mb-10 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ocean)]">How Azulva works</span>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Everything you need to actually book the trip.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={Sparkles} title="Today's Best Escapes" body="A curated feed of all-inclusive resort deals, ranked by the Azulva Score so you see the strongest options first." />
          <FeatureCard icon={Bell} title="Deal Watches" body="Save destinations and budgets. We'll surface matching trips for your home airport." />
          <FeatureCard icon={Bookmark} title="Escape Board" body="Save the destinations you're considering and the deals you might book. One shortlist, one click." />
          <FeatureCard icon={Users} title="Trip Rooms" body="Invite friends, vote on destinations and deals, and surface the strongest group fit." />
          <FeatureCard icon={Award} title="Azulva Score" body="A transparent 0–100 score that blends price value, resort quality, flight convenience, and freshness." />
          <FeatureCard icon={Compass} title="Destination Intelligence" body="See weather, currency, trip vibe, and deal quality for each destination — in one place." />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-muted/40 py-12">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
            <div className="rounded-2xl bg-[var(--ocean)]/10 p-3 text-[var(--ocean)]">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl">Verification &amp; affiliate transparency</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Outbound links may use affiliate partners, but Azulva always shows source, freshness, and verification notes. Prices, availability, inclusions, and policies should always be verified with the booking provider before purchase.
              </p>
            </div>
            <Link to="/affiliate-disclosure" className="rounded-full border border-border px-4 py-2 text-xs hover:bg-muted">
              Read disclosure
            </Link>
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-[var(--ocean)]/10 via-background to-[var(--coral)]/10 p-8 md:p-12">
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl">Stop scrolling. Start booking smarter.</h2>
              <p className="mt-2 text-muted-foreground">
                Join early access and we'll let you know when matching trips come up — for your group, your budget, your dates.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href="#waitlist" className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90">
                  Join the waitlist <ArrowRight className="h-4 w-4" />
                </a>
                <Link to="/explore" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted">
                  Explore demo deals <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                "Curated all-inclusive deals, not algorithmic noise.",
                "Score, sort, save, and share with one tap.",
                "Group voting + Group Fit for travel decisions.",
                "Always-on transparency: source, freshness, disclaimers.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-[var(--success)]" /> <span>{t}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-6 md:grid-cols-4 text-sm">
            <div>
              <AzulvaLogo className="h-7 w-auto" />
              <p className="mt-3 text-muted-foreground">Find the all-inclusive trip everyone actually agrees on.</p>
            </div>
            <div>
              <div className="font-semibold mb-2">Product</div>
              <ul className="space-y-1 text-muted-foreground">
                <li><Link to="/explore">Explore</Link></li>
                <li><Link to="/watchlist">Watchlists</Link></li>
                <li><Link to="/trips">Trip Rooms</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Company</div>
              <ul className="space-y-1 text-muted-foreground">
                <li><Link to="/about">About</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/how-scores-work">How the Azulva Score works</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Legal</div>
              <ul className="space-y-1 text-muted-foreground">
                <li><Link to="/privacy">Privacy</Link></li>
                <li><Link to="/terms">Terms</Link></li>
                <li><Link to="/affiliate-disclosure">Affiliate Disclosure</Link></li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            Azulva helps travelers discover and compare vacation opportunities. Prices, availability, inclusions, and policies should always be verified with the booking provider before purchase. Some outbound links may be affiliate links.
          </p>
        </div>
      </footer>

      <FeedbackWidget />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body }: { icon: typeof Sparkles; title: string; body: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition hover:shadow-md">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ocean)]/10 text-[var(--ocean)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-display text-lg">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function SuccessState({ refCode, wasExisting, onCopy, copied }: {
  refCode: string | null; wasExisting: boolean; onCopy: () => void; copied: boolean;
}) {
  const url = refCode ? referralUrl(refCode) : "";
  return (
    <div>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
        <Check className="h-5 w-5" />
      </div>
      <h2 className="mt-3 font-display text-2xl">You're on the list.</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {wasExisting ? "We updated your preferences — keep an eye on your inbox." : "We'll email you the moment your early access spot is ready."}
      </p>
      {refCode && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your referral link</div>
          <div className="flex items-stretch gap-2">
            <input readOnly value={url} className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs" />
            <button onClick={onCopy} className="inline-flex items-center gap-1 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background">
              {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Suggested message: "I joined Azulva — it helps groups find and compare all-inclusive trip deals."
          </p>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/explore" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs hover:bg-muted">
          <MapPin className="h-3.5 w-3.5" /> Explore destinations
        </Link>
        <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs hover:bg-muted">
          <Plane className="h-3.5 w-3.5" /> Sign in to save deals
        </Link>
      </div>
    </div>
  );
}
