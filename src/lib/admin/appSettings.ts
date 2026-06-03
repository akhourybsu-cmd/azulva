// DB-backed app settings with module-level cache. Falls back to VITE_APP_MODE
// for app_mode if the DB hasn't been loaded yet.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppSettings = {
  app_mode: "demo" | "production";
  show_sample_deals: boolean;
  allow_public_custom_deals: boolean;
  affiliate_disclosure_enabled: boolean;
  verification_notice_enabled: boolean;
};

const DEFAULTS: AppSettings = {
  app_mode: ((import.meta.env.VITE_APP_MODE as string | undefined)?.toLowerCase() === "production"
    ? "production" : "demo"),
  show_sample_deals: true,
  allow_public_custom_deals: true,
  affiliate_disclosure_enabled: true,
  verification_notice_enabled: true,
};

let cached: AppSettings = { ...DEFAULTS };
let loaded = false;
const listeners = new Set<() => void>();

export function getCachedAppSettings(): AppSettings {
  return cached;
}

export async function loadAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from("app_settings").select("key,value");
  if (error || !data) { loaded = true; return cached; }
  const next = { ...DEFAULTS };
  for (const row of data) {
    const k = row.key as keyof AppSettings;
    const v = row.value as unknown;
    if (k in next) {
      // @ts-expect-error narrow at runtime
      next[k] = v;
    }
  }
  cached = next;
  loaded = true;
  listeners.forEach((l) => l());
  return cached;
}

export function isAppSettingsLoaded() { return loaded; }

export async function setAppSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value: value as unknown as never, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  cached = { ...cached, [key]: value };
  listeners.forEach((l) => l());
  return { ok: true };
}

export function useAppSettings(): AppSettings {
  const [s, setS] = useState<AppSettings>(cached);
  useEffect(() => {
    if (!loaded) loadAppSettings().then(() => setS(cached));
    const fn = () => setS(cached);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return s;
}
