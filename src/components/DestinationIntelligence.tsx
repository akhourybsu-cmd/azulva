import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CloudRain, Sun, Wind, Coins, Globe2, Languages, Building2, Sparkles } from "lucide-react";
import {
  getDestinationIntelligence,
  type DestinationIntelligence,
} from "@/lib/providers/destinationIntelligence.functions";

export interface DestinationIntelInput {
  destinationId: string;
  latitude?: number | null;
  longitude?: number | null;
  countryCode?: string | null;
  currencyCode?: string | null;
  placeQuery?: string | null;
}

export function useDestinationIntelligence(input: DestinationIntelInput) {
  const fn = useServerFn(getDestinationIntelligence);
  return useQuery<DestinationIntelligence>({
    queryKey: [
      "destination-intel",
      input.destinationId,
      input.latitude ?? null,
      input.longitude ?? null,
      input.countryCode ?? null,
      input.currencyCode ?? null,
    ],
    queryFn: () =>
      fn({
        data: {
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          countryCode: input.countryCode ?? null,
          currencyCode: input.currencyCode ?? null,
          placeQuery: input.placeQuery ?? null,
        },
      }),
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

function CardShell({
  title,
  icon,
  children,
  footer,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-foreground">{icon}</span>
        <h3 className="font-display text-lg">{title}</h3>
      </div>
      {children}
      {footer && <p className="mt-3 text-[11px] text-muted-foreground">{footer}</p>}
    </div>
  );
}

function relTime(iso: string) {
  const ms = Date.now() - Date.parse(iso);
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function WeatherNowCard({ input }: { input: DestinationIntelInput }) {
  const q = useDestinationIntelligence(input);
  const w = q.data?.weather;
  return (
    <CardShell
      title="Weather Now"
      icon={<Sun className="h-4 w-4" />}
      footer="Live data from Open-Meteo. Planning context only — verify before booking."
    >
      {q.isLoading ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      ) : !w ? (
        <p className="text-sm text-muted-foreground">
          Weather not available right now. We'll try again automatically.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-display text-3xl tabular-nums">{w.temperatureF}°F</div>
              <div className="text-xs text-muted-foreground">{Math.round(w.temperatureC)}°C now</div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ocean)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--ocean)]">
              {w.comfortTag === "Rain risk" ? <CloudRain className="h-3.5 w-3.5" /> : <Wind className="h-3.5 w-3.5" />}
              {w.comfortTag}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CloudRain className="h-3.5 w-3.5" />
              {w.precipitationProbability != null
                ? `${w.precipitationProbability}% rain (next 12h)`
                : `${w.precipitationMm.toFixed(1)}mm now`}
            </span>
            <span suppressHydrationWarning>Updated {relTime(w.fetchedAt)}</span>
          </div>
        </div>
      )}
    </CardShell>
  );
}

export function DestinationBasicsCard({
  input,
  fallback,
}: {
  input: DestinationIntelInput;
  fallback: { country: string; region: string; languages: string[]; currencyCode: string };
}) {
  const q = useDestinationIntelligence(input);
  const c = q.data?.country;
  const country = c?.name ?? fallback.country;
  const region = c?.subregion || c?.region || fallback.region;
  const languages = c?.languages?.length ? c.languages : fallback.languages;
  const currency = c?.currencyCode ?? fallback.currencyCode;
  return (
    <CardShell
      title="Destination Basics"
      icon={<Globe2 className="h-4 w-4" />}
      footer="Country metadata from REST Countries (open data)."
    >
      <div className="flex items-center gap-3">
        {c?.flagPng ? (
          <img src={c.flagPng} alt={`${country} flag`} className="h-9 w-12 rounded-md border border-border object-cover" />
        ) : (
          <div className="grid h-9 w-12 place-items-center rounded-md border border-border text-xl">
            {c?.flagEmoji || "🏳️"}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-semibold">{country}</div>
          <div className="text-xs text-muted-foreground">{region}</div>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {c?.capital && (
          <li className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /> Capital · {c.capital}</li>
        )}
        <li className="flex items-center gap-2"><Languages className="h-4 w-4 text-muted-foreground" /> {languages.join(", ")}</li>
        <li className="flex items-center gap-2"><Coins className="h-4 w-4 text-muted-foreground" /> {currency}{c?.currencyName ? ` · ${c.currencyName}` : ""}</li>
      </ul>
    </CardShell>
  );
}

export function MoneyBasicsCard({
  input,
  fallback,
}: {
  input: DestinationIntelInput;
  fallback: { currencyCode: string };
}) {
  const q = useDestinationIntelligence(input);
  const cur = q.data?.currency;
  const country = q.data?.country;
  const currencyCode = cur?.target ?? country?.currencyCode ?? fallback.currencyCode;
  const symbol = country?.currencySymbol ?? "";
  return (
    <CardShell
      title="Money Basics"
      icon={<Coins className="h-4 w-4" />}
      footer="Rates from Frankfurter. Verify exact prices with the booking provider before purchase."
    >
      {q.isLoading ? (
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
      ) : cur?.isUsd ? (
        <p className="text-sm">
          <span className="font-semibold">{currencyCode}</span> — this destination commonly uses USD or prices are commonly shown in USD.
        </p>
      ) : cur ? (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-semibold tabular-nums">$100 USD ≈ {symbol}{(cur.rate * 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} {cur.target}</span>
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            1 USD ≈ {cur.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {cur.target}
          </div>
          <div className="text-[11px] text-muted-foreground" suppressHydrationWarning>
            Updated {relTime(cur.fetchedAt)}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Live exchange rate unavailable. Local currency: <span className="font-semibold">{currencyCode}</span>.
        </p>
      )}
    </CardShell>
  );
}

export function DealDestinationContextCard({
  input,
  destName,
  bestMonths,
  rainyMonths,
}: {
  input: DestinationIntelInput;
  destName: string;
  bestMonths: number[];
  rainyMonths: number[];
}) {
  const q = useDestinationIntelligence(input);
  const w = q.data?.weather;
  const c = q.data?.country;
  const cur = q.data?.currency;
  const monthName = (m: number) => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--ocean)]" />
        <div className="text-sm font-semibold">Destination context · {destName}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground">Weather now</div>
          <div className="mt-0.5 font-semibold">
            {w ? `${w.temperatureF}°F · ${w.comfortTag}` : q.isLoading ? "Loading…" : "—"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Currency</div>
          <div className="mt-0.5 font-semibold tabular-nums">
            {cur?.isUsd
              ? "USD"
              : cur
                ? `1 USD ≈ ${cur.rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${cur.target}`
                : c?.currencyCode || "—"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Best months</div>
          <div className="mt-0.5 font-semibold">{bestMonths.map(monthName).join(", ") || "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Rain risk</div>
          <div className="mt-0.5 font-semibold">{rainyMonths.length ? rainyMonths.map(monthName).join(", ") : "Low year-round"}</div>
        </div>
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">
        Weather and currency data are provided for planning context and may not reflect booking-provider pricing.
      </p>
    </div>
  );
}
