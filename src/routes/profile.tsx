import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  loadProfileAndPrefs, saveProfile, savePreferences,
  DEFAULT_PREFERENCES, type CloudProfile, type CloudPreferences,
} from "@/lib/cloudSync";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Azulva" }] }),
  component: ProfilePage,
});

const STYLES = ["Budget","Luxury","Adults-only","Family","Party","Relaxing","Food-focused","Beach-first","Excursions","Casino","Honeymoon","Group trip"];
const LOCAL_KEY = "azulva-profile-anon-v1";

function initials(name: string | null | undefined, email?: string | null) {
  const src = (name?.trim() || email?.split("@")[0] || "AZ").toUpperCase();
  return src.split(/\s+/).map((p) => p[0]).join("").slice(0, 2);
}

function ProfilePage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<CloudProfile>({ display_name: "", avatar_url: "", home_airport: "" });
  const [prefs, setPrefs] = useState<CloudPreferences>(DEFAULT_PREFERENCES);
  const [backupInput, setBackupInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (user) {
        try {
          const { profile: p, prefs: pr } = await loadProfileAndPrefs(user.id);
          if (!active) return;
          setProfile({ ...p, display_name: p.display_name ?? "", avatar_url: p.avatar_url ?? "", home_airport: p.home_airport ?? "" });
          setPrefs(pr);
        } catch (e) { console.error(e); }
      } else if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LOCAL_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            setProfile(parsed.profile ?? profile);
            setPrefs({ ...DEFAULT_PREFERENCES, ...parsed.prefs });
          }
        } catch {}
      }
      setHydrated(true);
    }
    if (!loading) load();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  async function onSave() {
    setSaving(true);
    try {
      if (user) {
        await Promise.all([
          saveProfile(user.id, profile),
          savePreferences(user.id, prefs),
        ]);
        toast.success("Profile saved");
      } else {
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_KEY, JSON.stringify({ profile, prefs }));
        }
        toast.success("Saved locally — sign in to sync across devices");
      }
    } catch (e) {
      toast.error((e as Error).message ?? "Save failed");
    } finally { setSaving(false); }
  }

  function toggleTag(t: string) {
    setPrefs((p) => ({
      ...p, travelStyles: p.travelStyles.includes(t)
        ? p.travelStyles.filter((x) => x !== t) : [...p.travelStyles, t],
    }));
  }
  function addBackup() {
    const code = backupInput.trim().toUpperCase();
    if (!code || prefs.backupAirports.includes(code)) return;
    setPrefs((p) => ({ ...p, backupAirports: [...p.backupAirports, code] }));
    setBackupInput("");
  }

  if (!hydrated) {
    return <AppShell><div className="py-12 text-center text-sm text-muted-foreground">Loading your profile…</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-muted">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-xl">{initials(profile.display_name, user?.email)}</span>
          )}
        </div>
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Your profile</h1>
          <p className="text-sm text-muted-foreground">
            {user ? `Signed in as ${user.email}` : <>Browsing as guest. <Link to="/auth" className="underline">Sign in</Link> to sync across devices.</>}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Section title="Basics">
          <Field label="Display name">
            <input value={profile.display_name ?? ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} className="input" placeholder="What should we call you?" />
          </Field>
          <Field label="Avatar URL (optional)">
            <input value={profile.avatar_url ?? ""} onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} className="input" placeholder="https://…" />
          </Field>
          <Field label="Home airport">
            <input value={profile.home_airport ?? ""} onChange={(e) => setProfile({ ...profile, home_airport: e.target.value.toUpperCase() })} className="input" placeholder="BOS" />
          </Field>
          <Field label="Backup airports">
            <div className="flex flex-wrap gap-1.5">
              {prefs.backupAirports.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                  {a}
                  <button type="button" onClick={() => setPrefs((p) => ({ ...p, backupAirports: p.backupAirports.filter((x) => x !== a) }))} className="text-muted-foreground hover:text-destructive">×</button>
                </span>
              ))}
              <div className="flex gap-1">
                <input value={backupInput} onChange={(e) => setBackupInput(e.target.value.toUpperCase())} placeholder="JFK" className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs uppercase" />
                <button type="button" onClick={addBackup} className="rounded-md bg-foreground px-2 py-1 text-xs text-background">Add</button>
              </div>
            </div>
          </Field>
          <Field label={`Max budget per person: $${prefs.budgetPerPerson}`}>
            <input type="range" min={500} max={4000} step={50} value={prefs.budgetPerPerson} onChange={(e) => setPrefs({ ...prefs, budgetPerPerson: +e.target.value })} className="w-full accent-[var(--ocean)]" />
          </Field>
          <Field label="Passport status">
            <select value={prefs.passportStatus} onChange={(e) => setPrefs({ ...prefs, passportStatus: e.target.value as CloudPreferences["passportStatus"] })} className="input">
              <option value="unknown">Prefer not to say</option>
              <option value="yes">Valid passport</option>
              <option value="expiring">Expiring within 6 months</option>
              <option value="no">No passport yet</option>
            </select>
          </Field>
        </Section>

        <Section title="Travel style">
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => {
              const on = prefs.travelStyles.includes(s);
              return (
                <button key={s} type="button" onClick={() => toggleTag(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-muted"}`}>
                  {s}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Preferred destinations</div>
            <div className="flex flex-wrap gap-2">
              {mockDestinations.slice(0, 12).map((d) => {
                const on = prefs.preferredDestinations.includes(d.id);
                return (
                  <button key={d.id} type="button"
                    onClick={() => setPrefs((p) => ({ ...p, preferredDestinations: on ? p.preferredDestinations.filter((x) => x !== d.id) : [...p.preferredDestinations, d.id] }))}
                    className={`rounded-full border px-3 py-1.5 text-xs ${on ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-muted"}`}>
                    {d.name}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section title="Notifications">
          <Field label="">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={prefs.notifications.email} onChange={(e) => setPrefs({ ...prefs, notifications: { ...prefs.notifications, email: e.target.checked } })} />
              Email me when matching deals appear
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={prefs.notifications.push} onChange={(e) => setPrefs({ ...prefs, notifications: { ...prefs.notifications, push: e.target.checked } })} />
              Push notifications (when supported)
            </label>
          </Field>
          <Field label="Alert frequency">
            <select value={prefs.notifications.frequency} onChange={(e) => setPrefs({ ...prefs, notifications: { ...prefs.notifications, frequency: e.target.value as "instant" | "daily" | "weekly" } })} className="input">
              <option value="instant">Instant</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </Field>
        </Section>

        <Section title="Save">
          <button disabled={saving} onClick={onSave} className="w-full rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-60">
            {saving ? "Saving…" : user ? "Save to your account" : "Save locally"}
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            {user ? "Profile and preferences sync across devices." : "Sign in to keep these settings in sync."}
          </p>
        </Section>
      </div>

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
  return <label className="block text-xs">{label && <div className="mb-1 uppercase tracking-wider text-muted-foreground">{label}</div>}{children}</label>;
}
