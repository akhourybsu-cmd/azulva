import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Azulva" }] }),
  component: ProfilePage,
});

const STYLES = ["Budget","Luxury","Adults-only","Family","Party","Relaxing","Food-focused","Beach-first","Excursions","Casino","Honeymoon","Group trip"];

function ProfilePage() {
  const [name, setName] = useState("Traveler");
  const [airport, setAirport] = useState("BOS");
  const [budget, setBudget] = useState(1500);
  const [tags, setTags] = useState<string[]>(["Relaxing","Couples"]);

  return (
    <AppShell>
      <h1 className="font-display text-3xl md:text-4xl">Your profile</h1>
      <p className="mt-1 text-muted-foreground">Tell us how you travel — we'll tune your deal feed.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Section title="Basics">
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
          <Field label="Home airport"><input value={airport} onChange={(e) => setAirport(e.target.value.toUpperCase())} className="input" /></Field>
          <Field label={`Max budget per person: $${budget}`}>
            <input type="range" min={500} max={4000} step={50} value={budget} onChange={(e) => setBudget(+e.target.value)} className="w-full accent-[var(--ocean)]" />
          </Field>
        </Section>

        <Section title="Travel style">
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => {
              const on = tags.includes(s);
              return (
                <button key={s} type="button"
                  onClick={() => setTags((t) => on ? t.filter((x) => x !== s) : [...t, s])}
                  className={`rounded-full border px-3 py-1.5 text-xs ${on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-muted"}`}>
                  {s}
                </button>
              );
            })}
          </div>
        </Section>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">Saved locally for this MVP. Connect Lovable Cloud to persist across devices.</p>
      <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem}`}</style>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 font-display text-xl">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs"><div className="mb-1 uppercase tracking-wider text-muted-foreground">{label}</div>{children}</label>;
}
