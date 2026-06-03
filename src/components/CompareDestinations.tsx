import { useState } from "react";
import { X, Sun, CloudRain, Coins, Globe2 } from "lucide-react";
import type { Destination } from "@/lib/types";
import { useAllDeals } from "@/lib/store";
import { useDestinationIntelligence } from "@/components/DestinationIntelligence";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthName = (m: number) => MONTHS[m - 1];

function CompareCell({ dest }: { dest: Destination }) {
  const deals = useAllDeals().filter((d) => d.destinationId === dest.id);
  const min = deals.length ? Math.min(...deals.map((d) => d.pricePerPerson)) : null;
  const max = deals.length ? Math.max(...deals.map((d) => d.pricePerPerson)) : null;
  const adults = deals.filter((d) => d.adultsOnly).length;
  const family = deals.filter((d) => d.familyFriendly).length;

  const q = useDestinationIntelligence({
    destinationId: dest.id,
    latitude: dest.latitude,
    longitude: dest.longitude,
    countryCode: dest.countryCode,
    currencyCode: dest.currencyCode,
  });
  const w = q.data?.weather;
  const c = q.data?.country;
  const cur = q.data?.currency;

  return (
    <div className="min-w-[220px] flex-1 rounded-2xl border border-border bg-card p-4">
      <div className="aspect-[16/10] overflow-hidden rounded-xl">
        <img src={dest.imageUrl} alt={dest.name} className="h-full w-full object-cover" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        {c?.flagPng ? (
          <img src={c.flagPng} alt="" className="h-5 w-7 rounded border border-border object-cover" />
        ) : (
          <span className="text-base">{c?.flagEmoji ?? "🏳️"}</span>
        )}
        <div className="min-w-0">
          <div className="truncate font-display text-lg leading-tight">{dest.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{dest.country}</div>
        </div>
      </div>

      <dl className="mt-3 space-y-2 text-xs">
        <Row label="Hot deals">{deals.length}</Row>
        <Row label="Price range">{min ? `$${min}–$${max}/pp` : "—"}</Row>
        <Row label="Adults-only deals">{adults}</Row>
        <Row label="Family-friendly deals">{family}</Row>
        <Row label="Best months">{dest.bestMonths.map(monthName).join(", ")}</Row>
        <Row label="Rainy months">
          {dest.rainyMonths.length ? dest.rainyMonths.map(monthName).join(", ") : "Low year-round"}
        </Row>
        <Row label="Weather now">
          {w ? (
            <span className="inline-flex items-center gap-1">
              <Sun className="h-3 w-3" /> {w.temperatureF}°F · {w.comfortTag}
            </span>
          ) : q.isLoading ? "Loading…" : "—"}
        </Row>
        <Row label="Currency">
          <span className="inline-flex items-center gap-1">
            <Coins className="h-3 w-3" />
            {cur?.isUsd
              ? "USD"
              : cur
                ? `1 USD ≈ ${cur.rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${cur.target}`
                : (c?.currencyCode || dest.currencyCode)}
          </span>
        </Row>
        <Row label="Region">
          <span className="inline-flex items-center gap-1">
            <Globe2 className="h-3 w-3" /> {dest.region}
          </span>
        </Row>
        <Row label="Vibe">
          <span className="flex flex-wrap gap-1">
            {dest.vibeTags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{t}</span>
            ))}
          </span>
        </Row>
        {dest.rainyMonths.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            <CloudRain className="mr-1 inline h-3 w-3" />Rainy season context — verify dates before booking.
          </p>
        )}
      </dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-1.5 last:border-0">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export function CompareDestinationsDialog({
  destinations,
  open,
  onClose,
}: {
  destinations: Destination[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="font-display text-xl">Compare destinations</h2>
            <p className="text-xs text-muted-foreground">
              Weather, currency, and deal context — for planning only. Verify prices with the booking provider.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="overflow-auto p-4">
          {destinations.length < 2 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Choose 2–4 destinations to compare weather, currency, deal strength, and trip vibe.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {destinations.map((d) => <CompareCell key={d.id} dest={d} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function useCompareSet(max = 4) {
  const [ids, setIds] = useState<string[]>([]);
  return {
    ids,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) =>
      setIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= max ? prev : [...prev, id]
      ),
    clear: () => setIds([]),
    max,
  };
}
