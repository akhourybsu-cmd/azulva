// Shared types for API providers
export interface ProviderHealth {
  providerName: string;
  status: "ok" | "missing_key" | "error" | "rate_limited";
  message?: string;
  lastCheckedAt: string;
}

export interface CachedResponse<T> {
  data: T;
  cachedAt: string;
  expiresAt: string;
  source: string;
}

export interface BaseProvider {
  readonly name: string;
  isConfigured(): boolean;
  health(): Promise<ProviderHealth>;
}
