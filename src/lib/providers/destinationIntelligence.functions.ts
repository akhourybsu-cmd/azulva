// Destination intelligence providers — Open-Meteo, REST Countries, Frankfurter.
// All keyless. Calls are made server-side via createServerFn; clients import the
// fn and call it through useServerFn / useQuery so no API URL is hit from the
// browser. Failures are swallowed and surfaced as nulls so the UI degrades
// gracefully. Responses are cached via ApiCache (in-memory per server worker).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ApiCache } from "@/lib/api/ApiCache";
import { ApiHealth } from "@/lib/api/ApiHealth";

const WEATHER_TTL = 30 * 60 * 1000;       // 30 minutes
const COUNTRY_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const CURRENCY_TTL = 24 * 60 * 60 * 1000;  // 1 day
const GEOCODE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days (Nominatim politeness)

async function fetchJson(url: string, providerName: string, timeoutMs = 6000): Promise<unknown> {
  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // Identify ourselves per Nominatim/REST-Countries etiquette.
        "User-Agent": "Azulva/1.0 (+https://azulva.app)",
        Accept: "application/json",
      },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    ApiHealth.record({
      providerName,
      status: "ok",
      message: `OK ${Date.now() - started}ms`,
      lastCheckedAt: new Date().toISOString(),
    });
    return data;
  } catch (err) {
    ApiHealth.record({
      providerName,
      status: "error",
      message: (err as Error).message,
      lastCheckedAt: new Date().toISOString(),
    });
    throw err;
  }
}

export interface WeatherSnapshot {
  temperatureC: number;
  temperatureF: number;
  precipitationMm: number;
  precipitationProbability: number | null;
  weatherCode: number;
  comfortTag: "Beach-friendly" | "Warm escape" | "Rain risk" | "Cool" | "Mixed";
  fetchedAt: string;
}

export interface CountryInfo {
  name: string;
  officialName: string;
  flagEmoji: string;
  flagPng: string;
  region: string;
  subregion?: string;
  capital?: string;
  languages: string[];
  currencyCode?: string;
  currencyName?: string;
  currencySymbol?: string;
  fetchedAt: string;
}

export interface CurrencyInfo {
  base: "USD";
  target: string;
  rate: number;
  fetchedAt: string;
  isUsd: boolean;
}

export interface DestinationIntelligence {
  weather: WeatherSnapshot | null;
  country: CountryInfo | null;
  currency: CurrencyInfo | null;
}

function comfortTag(tempC: number, precipMm: number): WeatherSnapshot["comfortTag"] {
  if (!Number.isFinite(tempC)) return "Mixed";
  if (precipMm >= 5) return "Rain risk";
  if (tempC >= 26 && precipMm < 2) return "Beach-friendly";
  if (tempC >= 22) return "Warm escape";
  if (tempC < 16) return "Cool";
  return "Mixed";
}

async function getWeather(lat: number, lng: number): Promise<WeatherSnapshot | null> {
  const key = `openmeteo:${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = ApiCache.get<WeatherSnapshot>(key);
  if (cached) return cached;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,precipitation,weather_code` +
      `&hourly=precipitation_probability&forecast_days=1&temperature_unit=celsius&timezone=auto`;
    const data = (await fetchJson(url, "Open-Meteo")) as {
      current?: { temperature_2m?: number; precipitation?: number; weather_code?: number };
      hourly?: { precipitation_probability?: number[] };
    };
    const tempC = Number(data.current?.temperature_2m);
    const precip = Number(data.current?.precipitation ?? 0);
    const code = Number(data.current?.weather_code ?? 0);
    const probs = Array.isArray(data.hourly?.precipitation_probability)
      ? data.hourly!.precipitation_probability!.slice(0, 12).map(Number).filter(Number.isFinite)
      : [];
    const prob = probs.length ? Math.max(...probs) : null;
    const snap: WeatherSnapshot = {
      temperatureC: tempC,
      temperatureF: Math.round(tempC * 9 / 5 + 32),
      precipitationMm: precip,
      precipitationProbability: prob,
      weatherCode: code,
      comfortTag: comfortTag(tempC, precip),
      fetchedAt: new Date().toISOString(),
    };
    ApiCache.set(key, snap, WEATHER_TTL, "Open-Meteo");
    return snap;
  } catch {
    return null;
  }
}

async function getCountry(countryCode: string): Promise<CountryInfo | null> {
  const code = countryCode.toUpperCase();
  const key = `restcountries:${code}`;
  const cached = ApiCache.get<CountryInfo>(key);
  if (cached) return cached;
  try {
    const url =
      `https://restcountries.com/v3.1/alpha/${code}` +
      `?fields=name,flag,flags,region,subregion,capital,languages,currencies`;
    const raw = (await fetchJson(url, "REST Countries")) as unknown;
    const c = (Array.isArray(raw) ? raw[0] : raw) as {
      name?: { common?: string; official?: string };
      flag?: string;
      flags?: { png?: string; svg?: string };
      region?: string;
      subregion?: string;
      capital?: string[];
      languages?: Record<string, string>;
      currencies?: Record<string, { name?: string; symbol?: string }>;
    };
    const currencyEntries = c.currencies ? Object.entries(c.currencies) : [];
    const [currencyCode, currencyMeta] = currencyEntries[0] ?? [undefined, undefined];
    const info: CountryInfo = {
      name: c.name?.common ?? code,
      officialName: c.name?.official ?? "",
      flagEmoji: c.flag ?? "",
      flagPng: c.flags?.png ?? c.flags?.svg ?? "",
      region: c.region ?? "",
      subregion: c.subregion,
      capital: Array.isArray(c.capital) ? c.capital[0] : undefined,
      languages: c.languages ? Object.values(c.languages) : [],
      currencyCode,
      currencyName: currencyMeta?.name,
      currencySymbol: currencyMeta?.symbol,
      fetchedAt: new Date().toISOString(),
    };
    ApiCache.set(key, info, COUNTRY_TTL, "REST Countries");
    return info;
  } catch {
    return null;
  }
}

async function getCurrency(target: string): Promise<CurrencyInfo | null> {
  const upper = target.toUpperCase();
  if (upper === "USD") {
    return { base: "USD", target: "USD", rate: 1, fetchedAt: new Date().toISOString(), isUsd: true };
  }
  const key = `frankfurter:USD->${upper}`;
  const cached = ApiCache.get<CurrencyInfo>(key);
  if (cached) return cached;
  try {
    const url = `https://api.frankfurter.app/latest?from=USD&to=${upper}`;
    const data = (await fetchJson(url, "Frankfurter")) as { rates?: Record<string, number> };
    const rate = Number(data.rates?.[upper]);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("no rate");
    const info: CurrencyInfo = {
      base: "USD",
      target: upper,
      rate,
      fetchedAt: new Date().toISOString(),
      isUsd: false,
    };
    ApiCache.set(key, info, CURRENCY_TTL, "Frankfurter");
    return info;
  } catch {
    return null;
  }
}

// Nominatim geocoder — exposed for future use when a destination has no
// seeded lat/lng. We aggressively cache (30 days) and route ALL calls through
// ApiCache to respect Nominatim's 1 req/sec public usage policy. Do not call
// this in hot paths; prefer seeded coordinates from mockDestinations.
async function geocodePlace(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const key = `nominatim:${query.toLowerCase()}`;
  const cached = ApiCache.get<{ latitude: number; longitude: number }>(key);
  if (cached) return cached;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const data = (await fetchJson(url, "Nominatim")) as Array<{ lat?: string; lon?: string }>;
    const hit = Array.isArray(data) ? data[0] : undefined;
    if (!hit?.lat || !hit?.lon) return null;
    const result = { latitude: Number(hit.lat), longitude: Number(hit.lon) };
    ApiCache.set(key, result, GEOCODE_TTL, "Nominatim");
    return result;
  } catch {
    return null;
  }
}

export const getDestinationIntelligence = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      countryCode: z.string().min(2).max(3).nullable().optional(),
      currencyCode: z.string().min(3).max(3).nullable().optional(),
      placeQuery: z.string().min(2).max(120).nullable().optional(),
    }),
  )
  .handler(async ({ data }): Promise<DestinationIntelligence> => {
    let lat = data.latitude ?? null;
    let lng = data.longitude ?? null;

    // Only fall back to geocoding if we genuinely have no coords. Cached for 30d.
    if ((lat == null || lng == null) && data.placeQuery) {
      const geo = await geocodePlace(data.placeQuery);
      if (geo) {
        lat = geo.latitude;
        lng = geo.longitude;
      }
    }

    const [weather, country] = await Promise.all([
      lat != null && lng != null ? getWeather(lat, lng) : Promise.resolve(null),
      data.countryCode ? getCountry(data.countryCode) : Promise.resolve(null),
    ]);
    const targetCurrency = data.currencyCode || country?.currencyCode;
    const currency = targetCurrency ? await getCurrency(targetCurrency) : null;
    return { weather, country, currency };
  });

export const getApiHealthRecent = createServerFn({ method: "GET" }).handler(async () => {
  return { entries: ApiHealth.recent().slice(0, 50) };
});
