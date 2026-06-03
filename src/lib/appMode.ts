// Azulva app mode. Demo mode shows mock/sample deals freely;
// production mode hides sample deals from user-facing feeds.
// Controlled via VITE_APP_MODE env (defaults to "demo").

export type AppMode = "demo" | "production";

export function getAppMode(): AppMode {
  const raw = (import.meta.env.VITE_APP_MODE as string | undefined)?.toLowerCase();
  return raw === "production" ? "production" : "demo";
}

export function isProductionMode(): boolean {
  return getAppMode() === "production";
}

/** Whether to hide "Sample Deal" content from user-facing surfaces. */
export function shouldHideSampleDeals(): boolean {
  return isProductionMode();
}
