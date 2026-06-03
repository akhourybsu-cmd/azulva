// Simple in-memory API cache. Replace with Supabase api_cache table in production.
import type { CachedResponse } from "./ProviderTypes";

const store = new Map<string, CachedResponse<unknown>>();

export const ApiCache = {
  get<T>(key: string): T | null {
    const entry = store.get(key) as CachedResponse<T> | undefined;
    if (!entry) return null;
    if (Date.parse(entry.expiresAt) < Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.data;
  },
  set<T>(key: string, data: T, ttlMs: number, source: string) {
    const now = new Date();
    store.set(key, {
      data,
      cachedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      source,
    });
  },
  clear() { store.clear(); },
};
