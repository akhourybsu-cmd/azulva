import type { Deal, InclusionState, AllInclusiveConfidence } from "../types";
import { calculateDealScore } from "../scoring/DealScoringService";
import { mockResorts } from "./mockResorts";

const today = new Date();
function daysFromNow(d: number): string {
  const dt = new Date(today); dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

interface DealSeed {
  id: string;
  title: string;
  resortId: string;
  destinationId: string;
  departureAirport: string;
  daysOut: number;
  nights: number;
  pricePerPerson: number;
  benchmark: number;
  flightIncluded: InclusionState;
  transfersIncluded: InclusionState;
  bags: InclusionState;
  refundable: InclusionState;
  roomType: string;
  adultsOnly: boolean;
  familyFriendly: boolean;
  aiConf: AllInclusiveConfidence;
  source: Deal["sourceLabel"];
  sourceUrl: string;
  affiliateUrl?: string;
  aiSummary: string;
}

const seeds: DealSeed[] = [
  { id: "d-1", title: "Hard Rock Punta Cana — 5 nights, all-inclusive", resortId: "rs-1", destinationId: "dst-punta-cana", departureAirport: "BOS", daysOut: 45, nights: 5, pricePerPerson: 1189, benchmark: 1550, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "not_included", roomType: "Deluxe Diamond", adultsOnly: false, familyFriendly: true, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/hardrock", affiliateUrl: "https://example.com/aff?d=hardrock", aiSummary: "Strong family-friendly Punta Cana deal under typical pricing with flights and transfers included. Verify checked bags and cancellation window before booking." },
  { id: "d-2", title: "Excellence Punta Cana — adults-only 6 nights", resortId: "rs-2", destinationId: "dst-punta-cana", departureAirport: "JFK", daysOut: 62, nights: 6, pricePerPerson: 1620, benchmark: 1900, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "included", roomType: "Junior Suite Swim-Up", adultsOnly: true, familyFriendly: false, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/excellence", aiSummary: "Refundable adults-only luxury at a moderate discount. Excellent fit for couples trips." },
  { id: "d-3", title: "Moon Palace Cancun — 4 nights all-inclusive", resortId: "rs-4", destinationId: "dst-cancun", departureAirport: "BOS", daysOut: 28, nights: 4, pricePerPerson: 879, benchmark: 1100, flightIncluded: "included", transfersIncluded: "unknown", bags: "unknown", refundable: "not_included", roomType: "Superior Deluxe", adultsOnly: false, familyFriendly: true, aiConf: "Confirmed", source: "Sample Deal", sourceUrl: "https://example.com/moon", aiSummary: "Aggressively priced last-minute Cancun option. Confirm transfers and bag policy with booking partner." },
  { id: "d-4", title: "Live Aqua Cancun — adults-only romance", resortId: "rs-5", destinationId: "dst-cancun", departureAirport: "EWR", daysOut: 90, nights: 5, pricePerPerson: 1399, benchmark: 1700, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "included", roomType: "Aqua Club Ocean View", adultsOnly: true, familyFriendly: false, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/liveaqua", aiSummary: "Refundable adults-only package with everything bundled. Great for an early-spring couples trip." },
  { id: "d-5", title: "Secrets Maroma — adults-only paradise", resortId: "rs-7", destinationId: "dst-riviera-maya", departureAirport: "BOS", daysOut: 70, nights: 5, pricePerPerson: 1749, benchmark: 1850, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "not_included", roomType: "Preferred Club Ocean View", adultsOnly: true, familyFriendly: false, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/maroma", aiSummary: "Top-rated adults-only on a world-class beach. Modest discount; book if dates are firm." },
  { id: "d-6", title: "Hyatt Ziva Riviera Cancun — family 5 nights", resortId: "rs-6", destinationId: "dst-riviera-maya", departureAirport: "BDL", daysOut: 55, nights: 5, pricePerPerson: 1289, benchmark: 1450, flightIncluded: "included", transfersIncluded: "included", bags: "unknown", refundable: "not_included", roomType: "Family Suite", adultsOnly: false, familyFriendly: true, aiConf: "Confirmed", source: "Sample Deal", sourceUrl: "https://example.com/ziva", aiSummary: "Reliable family choice with strong reviews. Verify checked bag policy with the airline." },
  { id: "d-7", title: "Sandals Montego Bay — couples 6 nights", resortId: "rs-8", destinationId: "dst-jamaica", departureAirport: "JFK", daysOut: 80, nights: 6, pricePerPerson: 2199, benchmark: 2400, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "included", roomType: "Caribbean Honeymoon Suite", adultsOnly: true, familyFriendly: false, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/sandals-mobay", aiSummary: "Premium couples package with butler-adjacent service and full refundability." },
  { id: "d-8", title: "Beaches Negril — family 5 nights", resortId: "rs-9", destinationId: "dst-jamaica", departureAirport: "BOS", daysOut: 110, nights: 5, pricePerPerson: 1599, benchmark: 1750, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "not_included", roomType: "Caribbean Family Room", adultsOnly: false, familyFriendly: true, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/beaches-negril", aiSummary: "Family-friendly with waterpark and Sesame Street programming for kids." },
  { id: "d-9", title: "Riu Palace Antillas — adults-only Aruba", resortId: "rs-10", destinationId: "dst-aruba", departureAirport: "EWR", daysOut: 50, nights: 5, pricePerPerson: 1499, benchmark: 1650, flightIncluded: "included", transfersIncluded: "unknown", bags: "unknown", refundable: "not_included", roomType: "Junior Suite Ocean View", adultsOnly: true, familyFriendly: false, aiConf: "Likely", source: "Sample Deal", sourceUrl: "https://example.com/riu-aruba", aiSummary: "Outside the hurricane belt — solid year-round pick. Verify transfers." },
  { id: "d-10", title: "Atlantis Paradise Island — Bahamas family", resortId: "rs-11", destinationId: "dst-bahamas", departureAirport: "BOS", daysOut: 35, nights: 4, pricePerPerson: 1399, benchmark: 1500, flightIncluded: "included", transfersIncluded: "unknown", bags: "unknown", refundable: "not_included", roomType: "Coral Tower Ocean View", adultsOnly: false, familyFriendly: true, aiConf: "Unclear", source: "Sample Deal", sourceUrl: "https://example.com/atlantis", aiSummary: "Mega-resort experience — note that not all room packages are fully all-inclusive. Read the fine print before booking." },
  { id: "d-11", title: "Westin Reserva Conchal — Costa Rica", resortId: "rs-12", destinationId: "dst-costa-rica", departureAirport: "JFK", daysOut: 95, nights: 6, pricePerPerson: 1899, benchmark: 2100, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "included", roomType: "Deluxe Ocean View", adultsOnly: false, familyFriendly: true, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/westin-cr", aiSummary: "Adventure-friendly all-inclusive in Guanacaste with strong refund policy." },
  { id: "d-12", title: "Sandals Grande St. Lucian — couples 7 nights", resortId: "rs-13", destinationId: "dst-st-lucia", departureAirport: "JFK", daysOut: 120, nights: 7, pricePerPerson: 2699, benchmark: 2900, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "included", roomType: "Caribbean Beachfront Walkout", adultsOnly: true, familyFriendly: false, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/sandals-stlucia", aiSummary: "Honeymoon-grade couples package with Pitons views." },
  { id: "d-13", title: "Le Blanc Spa Cabo — adults-only luxury", resortId: "rs-14", destinationId: "dst-cabo", departureAirport: "BOS", daysOut: 100, nights: 5, pricePerPerson: 2399, benchmark: 2500, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "not_included", roomType: "Royale Master Suite", adultsOnly: true, familyFriendly: false, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/leblanc", aiSummary: "Ultra-luxury adults-only — small discount, but quality is exceptional." },
  { id: "d-14", title: "Hyatt Ziva Puerto Vallarta — family value", resortId: "rs-15", destinationId: "dst-puerto-vallarta", departureAirport: "JFK", daysOut: 75, nights: 5, pricePerPerson: 1049, benchmark: 1300, flightIncluded: "included", transfersIncluded: "included", bags: "unknown", refundable: "not_included", roomType: "Family Club Ocean View", adultsOnly: false, familyFriendly: true, aiConf: "Confirmed", source: "Sample Deal", sourceUrl: "https://example.com/ziva-pv", aiSummary: "Excellent value family-friendly option with strong inclusion confidence." },
  { id: "d-15", title: "Iberostar Bavaro — Punta Cana family", resortId: "rs-3", destinationId: "dst-punta-cana", departureAirport: "PVD", daysOut: 40, nights: 5, pricePerPerson: 999, benchmark: 1300, flightIncluded: "included", transfersIncluded: "included", bags: "unknown", refundable: "not_included", roomType: "Junior Suite", adultsOnly: false, familyFriendly: true, aiConf: "Confirmed", source: "Sample Deal", sourceUrl: "https://example.com/iberostar", aiSummary: "Very strong value for a 5-star family AI. Verify bag policy." },
  { id: "d-16", title: "Hard Rock Punta Cana — adults-only suite", resortId: "rs-1", destinationId: "dst-punta-cana", departureAirport: "JFK", daysOut: 130, nights: 7, pricePerPerson: 1799, benchmark: 2100, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "included", roomType: "Rock Suite Reserve", adultsOnly: true, familyFriendly: false, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/hr-rocksuite", aiSummary: "Adults-only premium suite at a discount with full refundability." },
  { id: "d-17", title: "Live Aqua Cancun — weekend escape", resortId: "rs-5", destinationId: "dst-cancun", departureAirport: "BOS", daysOut: 18, nights: 3, pricePerPerson: 749, benchmark: 950, flightIncluded: "included", transfersIncluded: "unknown", bags: "unknown", refundable: "not_included", roomType: "Aqua Club King", adultsOnly: true, familyFriendly: false, aiConf: "Likely", source: "Sample Deal", sourceUrl: "https://example.com/liveaqua-wknd", aiSummary: "Tight last-minute window — book quickly. Verify inclusions." },
  { id: "d-18", title: "Moon Palace Cancun — family 6 nights", resortId: "rs-4", destinationId: "dst-cancun", departureAirport: "LGA", daysOut: 85, nights: 6, pricePerPerson: 1349, benchmark: 1600, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "not_included", roomType: "Family Suite", adultsOnly: false, familyFriendly: true, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/moon-fam", aiSummary: "Reliable family choice with all inclusions confirmed." },
  { id: "d-19", title: "Secrets Maroma — 7-night romance", resortId: "rs-7", destinationId: "dst-riviera-maya", departureAirport: "EWR", daysOut: 140, nights: 7, pricePerPerson: 2349, benchmark: 2600, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "included", roomType: "Preferred Club Honeymoon Suite", adultsOnly: true, familyFriendly: false, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/maroma-7n", aiSummary: "Top-tier honeymoon package with refundable booking." },
  { id: "d-20", title: "Beaches Negril — spring break family", resortId: "rs-9", destinationId: "dst-jamaica", departureAirport: "BDL", daysOut: 60, nights: 5, pricePerPerson: 1799, benchmark: 1850, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "not_included", roomType: "Caribbean Family Suite", adultsOnly: false, familyFriendly: true, aiConf: "Confirmed", source: "Sample Deal", sourceUrl: "https://example.com/beaches-spring", aiSummary: "Spring-break window — small discount, book if dates work." },
  { id: "d-21", title: "Riu Palace Aruba — week in paradise", resortId: "rs-10", destinationId: "dst-aruba", departureAirport: "BOS", daysOut: 105, nights: 7, pricePerPerson: 1999, benchmark: 2200, flightIncluded: "included", transfersIncluded: "included", bags: "unknown", refundable: "not_included", roomType: "Junior Suite Ocean View", adultsOnly: true, familyFriendly: false, aiConf: "Likely", source: "Sample Deal", sourceUrl: "https://example.com/riu-week", aiSummary: "Solid year-round option outside hurricane belt." },
  { id: "d-22", title: "Atlantis Bahamas — long weekend", resortId: "rs-11", destinationId: "dst-bahamas", departureAirport: "JFK", daysOut: 22, nights: 4, pricePerPerson: 1199, benchmark: 1300, flightIncluded: "included", transfersIncluded: "unknown", bags: "unknown", refundable: "not_included", roomType: "Beach Tower Ocean View", adultsOnly: false, familyFriendly: true, aiConf: "Unclear", source: "Sample Deal", sourceUrl: "https://example.com/atlantis-wknd", aiSummary: "Note: Atlantis packages vary — confirm what's included before booking." },
  { id: "d-23", title: "Westin Conchal — Costa Rica adventure", resortId: "rs-12", destinationId: "dst-costa-rica", departureAirport: "BOS", daysOut: 150, nights: 7, pricePerPerson: 2199, benchmark: 2400, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "included", roomType: "Deluxe Beachfront", adultsOnly: false, familyFriendly: true, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/westin-adv", aiSummary: "Adventure week with golf, surf, and wildlife. Refundable." },
  { id: "d-24", title: "Hyatt Ziva PV — honeymoon package", resortId: "rs-15", destinationId: "dst-puerto-vallarta", departureAirport: "EWR", daysOut: 75, nights: 6, pricePerPerson: 1299, benchmark: 1600, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "included", roomType: "Master Ocean Suite", adultsOnly: true, familyFriendly: false, aiConf: "Confirmed", source: "Curated Deal", sourceUrl: "https://example.com/ziva-pv-hm", aiSummary: "Excellent value honeymoon package with refundability." },
  { id: "d-25", title: "Excellence PC — birthday trip 4 nights", resortId: "rs-2", destinationId: "dst-punta-cana", departureAirport: "BOS", daysOut: 38, nights: 4, pricePerPerson: 1149, benchmark: 1400, flightIncluded: "included", transfersIncluded: "included", bags: "included", refundable: "not_included", roomType: "Junior Suite", adultsOnly: true, familyFriendly: false, aiConf: "Confirmed", source: "Sample Deal", sourceUrl: "https://example.com/excellence-bday", aiSummary: "Short adults-only escape with strong inclusion confidence." },
];

export const mockDeals: Deal[] = seeds.map((s) => {
  const resort = mockResorts.find((r) => r.id === s.resortId)!;
  const score = calculateDealScore({
    pricePerPerson: s.pricePerPerson,
    benchmarkPrice: s.benchmark,
    resortGuestRating: resort.guestRating,
    resortStarRating: resort.starRating,
    nights: s.nights,
    flightIncluded: s.flightIncluded === "included",
    nonstopLikely: true,
    allInclusiveConfidence: s.aiConf,
    refundable: s.refundable === "included",
    daysUntilDeparture: s.daysOut,
    recentPriceDropPct: s.daysOut < 30 ? 0.08 : 0,
  });

  return {
    id: s.id,
    title: s.title,
    resortId: s.resortId,
    destinationId: s.destinationId,
    sourceLabel: s.source,
    sourceUrl: s.sourceUrl,
    affiliateUrl: s.affiliateUrl,
    departureAirport: s.departureAirport,
    arrivalAirport: "—",
    startDate: daysFromNow(s.daysOut),
    endDate: daysFromNow(s.daysOut + s.nights),
    nights: s.nights,
    pricePerPerson: s.pricePerPerson,
    totalPriceEstimate: s.pricePerPerson * 2,
    currencyCode: "USD",
    flightIncluded: s.flightIncluded,
    transfersIncluded: s.transfersIncluded,
    checkedBagsIncluded: s.bags,
    foodAndDrinksIncluded: s.aiConf === "Confirmed" || s.aiConf === "Likely" ? "included" : "unknown",
    hotelIncluded: "included",
    refundable: s.refundable,
    roomType: s.roomType,
    mealPlan: "All-Inclusive",
    adultsOnly: s.adultsOnly,
    familyFriendly: s.familyFriendly,
    cancellationNotes: s.refundable === "included" ? "Fully refundable up to 14 days before travel." : "Non-refundable — check with booking partner.",
    allInclusiveConfidence: s.aiConf,
    status: "active",
    lastCheckedAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    aiSummary: s.aiSummary,
    ...score,
  } as Deal;
});

// Generate fake price history per deal
export function mockPriceHistoryForDeal(dealId: string) {
  const deal = mockDeals.find((d) => d.id === dealId);
  if (!deal) return [];
  const out: { capturedAt: string; pricePerPerson: number }[] = [];
  const now = Date.now();
  for (let i = 60; i >= 0; i -= 5) {
    const noise = Math.sin(i / 7) * 80 + (Math.random() - 0.5) * 40;
    out.push({
      capturedAt: new Date(now - i * 86400000).toISOString(),
      pricePerPerson: Math.max(200, Math.round(deal.pricePerPerson + noise + (i / 60) * 200)),
    });
  }
  return out;
}
