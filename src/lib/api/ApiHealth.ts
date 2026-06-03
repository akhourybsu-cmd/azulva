// API health tracking. Replace with Supabase api_health_logs table.
import type { ProviderHealth } from "./ProviderTypes";

const log: ProviderHealth[] = [];

export const ApiHealth = {
  record(h: ProviderHealth) {
    log.unshift(h);
    if (log.length > 200) log.pop();
  },
  recent(): ProviderHealth[] { return [...log]; },
};
