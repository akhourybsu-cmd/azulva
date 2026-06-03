// Azulva app mode. DB-backed via app_settings (cached). Falls back to
// VITE_APP_MODE env at boot until the cache is hydrated.
import { getCachedAppSettings } from "./admin/appSettings";

export type AppMode = "demo" | "production";

export function getAppMode(): AppMode {
  return getCachedAppSettings().app_mode;
}

export function isProductionMode(): boolean {
  return getAppMode() === "production";
}

/** Hide "Sample Deal" entries from user-facing feeds when prod or setting off. */
export function shouldHideSampleDeals(): boolean {
  const s = getCachedAppSettings();
  if (s.app_mode === "production") return true;
  return s.show_sample_deals === false;
}
