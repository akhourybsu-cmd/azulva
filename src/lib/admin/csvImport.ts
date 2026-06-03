// CSV utilities for curated deal import. Lightweight RFC-4180-ish parser:
// handles quoted fields, commas inside quotes, escaped quotes ("").
import type { Deal, InclusionState, AllInclusiveConfidence } from "@/lib/types";
import { mockResorts } from "@/lib/data/mockResorts";
import { mockDestinations } from "@/lib/data/mockDestinations";
import { calculateDealScore } from "@/lib/scoring/DealScoringService";
import type { DealSourceRow } from "./dealSources";

export const CSV_HEADERS = [
  "title", "resort_name", "destination", "destination_slug",
  "source_slug", "source_url", "affiliate_url",
  "departure_airport", "arrival_airport",
  "start_date", "end_date", "nights",
  "price_per_person", "currency",
  "flight_included", "transfers_included", "checked_bags_included",
  "room_type", "meal_plan",
  "adults_only", "family_friendly", "refundable",
  "cancellation_notes",
  "all_inclusive_confidence", "source_confidence",
  "last_checked_at", "expires_at",
  "admin_notes", "status",
] as const;

export type CsvRow = Record<(typeof CSV_HEADERS)[number], string>;

export function buildCsvTemplate(): string {
  const example: CsvRow = {
    title: "Boston → Punta Cana · 5 nights all-inclusive",
    resort_name: "Iberostar Selection Bávaro",
    destination: "Punta Cana",
    destination_slug: "punta-cana",
    source_slug: "manual-curated",
    source_url: "https://www.example.com/deal/punta-cana-5n",
    affiliate_url: "",
    departure_airport: "BOS",
    arrival_airport: "PUJ",
    start_date: "2026-09-12",
    end_date: "2026-09-17",
    nights: "5",
    price_per_person: "1199",
    currency: "USD",
    flight_included: "included",
    transfers_included: "included",
    checked_bags_included: "unknown",
    room_type: "Deluxe Garden View",
    meal_plan: "All-Inclusive",
    adults_only: "false",
    family_friendly: "true",
    refundable: "unknown",
    cancellation_notes: "Refundable up to 14 days before travel.",
    all_inclusive_confidence: "Confirmed",
    source_confidence: "medium",
    last_checked_at: new Date().toISOString().slice(0, 10),
    expires_at: "",
    admin_notes: "",
    status: "active",
  };
  const headerLine = CSV_HEADERS.join(",");
  const valueLine = CSV_HEADERS.map((h) => csvCell(example[h])).join(",");
  return `${headerLine}\n${valueLine}\n`;
}

function csvCell(v: string): string {
  if (v == null) return "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Parse CSV text into an array of row objects keyed by header. */
export function parseCsv(text: string): { rows: CsvRow[]; headers: string[]; errors: string[] } {
  const errors: string[] = [];
  const all = parseRows(text);
  if (all.length === 0) return { rows: [], headers: [], errors: ["Empty CSV"] };
  const headers = all[0].map((h) => h.trim().toLowerCase());
  const known = new Set<string>(CSV_HEADERS);
  for (const h of headers) {
    if (!known.has(h)) errors.push(`Unknown column: "${h}" (ignored)`);
  }
  const rows: CsvRow[] = [];
  for (let i = 1; i < all.length; i++) {
    const r = all[i];
    if (r.length === 1 && r[0] === "") continue;
    const obj = {} as CsvRow;
    for (const h of CSV_HEADERS) obj[h] = "";
    headers.forEach((h, idx) => {
      if (known.has(h)) (obj as Record<string, string>)[h] = (r[idx] ?? "").trim();
    });
    rows.push(obj);
  }
  return { rows, headers, errors };
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export type ValidationLevel = "ok" | "warn" | "error";
export interface RowValidation {
  level: ValidationLevel;
  missing: string[];
  warnings: string[];
  resortId: string | null;
  destinationId: string | null;
  sourceId: string | null;
}

function normInc(v: string): InclusionState {
  const s = v.trim().toLowerCase();
  if (s === "included" || s === "yes" || s === "true" || s === "y") return "included";
  if (s === "not_included" || s === "no" || s === "false" || s === "n") return "not_included";
  if (s === "warning" || s === "warn") return "warning";
  return "unknown";
}
function normBool(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1";
}
function normConfidence(v: string): AllInclusiveConfidence {
  const s = v.trim().toLowerCase();
  if (s.startsWith("conf")) return "Confirmed";
  if (s.startsWith("lik")) return "Likely";
  if (s.startsWith("uncl")) return "Unclear";
  if (s.startsWith("not")) return "Not Included";
  return "Unknown";
}
function normStatus(v: string): Deal["status"] {
  const s = v.trim().toLowerCase();
  if (s === "draft" || s === "active" || s === "expiring" || s === "expired" || s === "flagged") return s;
  return "active";
}

export function validateRow(row: CsvRow, sources: DealSourceRow[]): RowValidation {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!row.resort_name) missing.push("resort_name");
  if (!row.destination && !row.destination_slug) missing.push("destination");
  if (!row.source_url && !row.affiliate_url) missing.push("source_url or affiliate_url");
  if (!row.price_per_person || isNaN(Number(row.price_per_person))) missing.push("price_per_person");
  if (!row.currency) warnings.push("currency missing — will default to USD");
  if (!row.start_date) missing.push("start_date");
  if (!row.end_date) missing.push("end_date");
  if (!row.nights || isNaN(Number(row.nights))) missing.push("nights");

  const resortName = row.resort_name.toLowerCase();
  const resort = mockResorts.find((r) => r.name.toLowerCase() === resortName);
  const resortId = resort?.id ?? null;
  if (!resortId) warnings.push(`Unknown resort "${row.resort_name}" — first resort will be used`);

  const destSlug = row.destination_slug.toLowerCase();
  const destName = row.destination.toLowerCase();
  const dest = mockDestinations.find(
    (d) => (destSlug && d.slug.toLowerCase() === destSlug) ||
           (destName && d.name.toLowerCase() === destName),
  );
  const destinationId = dest?.id ?? resort?.destinationId ?? null;
  if (!destinationId) warnings.push("Unknown destination — first destination will be used");

  let sourceId: string | null = null;
  if (row.source_slug) {
    const found = sources.find((s) => s.slug === row.source_slug.toLowerCase());
    if (found) sourceId = found.id;
    else warnings.push(`Unknown source slug "${row.source_slug}" — will default to Manual Curated`);
  }
  if (!sourceId) {
    const manual = sources.find((s) => s.slug === "manual-curated");
    if (manual) sourceId = manual.id;
  }

  let level: ValidationLevel = "ok";
  if (missing.length > 0) level = "error";
  else if (warnings.length > 0) level = "warn";

  return { level, missing, warnings, resortId, destinationId, sourceId };
}

export function rowToDeal(row: CsvRow, v: RowValidation): Deal {
  const resortId = v.resortId ?? mockResorts[0].id;
  const destinationId = v.destinationId ?? mockDestinations[0].id;
  const resort = mockResorts.find((r) => r.id === resortId)!;
  const nights = Math.max(1, Number(row.nights) || 1);
  const price = Math.max(0, Number(row.price_per_person) || 0);
  const benchmark = Math.round(price * 1.25);
  const daysOut = Math.max(0, Math.round((new Date(row.start_date).getTime() - Date.now()) / 86400000));
  const flight = normInc(row.flight_included);
  const confidence = normConfidence(row.all_inclusive_confidence);
  const score = calculateDealScore({
    pricePerPerson: price, benchmarkPrice: benchmark,
    resortGuestRating: resort.guestRating, resortStarRating: resort.starRating,
    nights, flightIncluded: flight === "included", nonstopLikely: true,
    allInclusiveConfidence: confidence,
    refundable: normInc(row.refundable) === "included",
    daysUntilDeparture: daysOut,
  });
  const title = row.title.trim() || `${resort.name} — ${nights} nights all-inclusive`;
  return {
    id: "csv-" + crypto.randomUUID().slice(0, 8),
    title,
    resortId, destinationId,
    sourceLabel: "Curated Deal",
    sourceId: v.sourceId,
    sourceUrl: row.source_url,
    affiliateUrl: row.affiliate_url || undefined,
    departureAirport: (row.departure_airport || "BOS").toUpperCase(),
    arrivalAirport: (row.arrival_airport || "PUJ").toUpperCase(),
    startDate: row.start_date,
    endDate: row.end_date,
    nights,
    pricePerPerson: price,
    totalPriceEstimate: price * 2,
    currencyCode: (row.currency || "USD").toUpperCase(),
    flightIncluded: flight,
    transfersIncluded: normInc(row.transfers_included),
    checkedBagsIncluded: normInc(row.checked_bags_included),
    foodAndDrinksIncluded: "included",
    hotelIncluded: "included",
    refundable: normInc(row.refundable),
    roomType: row.room_type || "Standard",
    mealPlan: row.meal_plan || "All-Inclusive",
    adultsOnly: normBool(row.adults_only),
    familyFriendly: row.family_friendly ? normBool(row.family_friendly) : true,
    cancellationNotes: row.cancellation_notes || undefined,
    allInclusiveConfidence: confidence,
    status: normStatus(row.status),
    lastCheckedAt: row.last_checked_at
      ? new Date(row.last_checked_at).toISOString()
      : new Date().toISOString(),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
    adminNotes: row.admin_notes || undefined,
    sourceConfidence: (["high", "medium", "low", "unknown"].includes(row.source_confidence.toLowerCase())
      ? (row.source_confidence.toLowerCase() as Deal["sourceConfidence"])
      : "medium"),
    aiSummary: "Imported from CSV. Verify all details with the booking partner.",
    ...score,
  };
}

export function dealsAreLikelyDuplicate(a: Deal, b: Deal): boolean {
  return a.resortId === b.resortId
    && a.departureAirport === b.departureAirport
    && a.startDate.slice(0, 10) === b.startDate.slice(0, 10)
    && a.endDate.slice(0, 10) === b.endDate.slice(0, 10)
    && Math.abs(a.pricePerPerson - b.pricePerPerson) < 1
    && (a.sourceId ?? "") === (b.sourceId ?? "");
}
