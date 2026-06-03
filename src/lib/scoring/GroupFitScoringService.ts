// Group Fit Scoring Service — ranks destinations + deals inside a Trip Room
// by how well they fit the entire group's stated preferences and votes.
import type {
  Deal,
  Destination,
  DestinationVote,
  DealVote,
  TripRoom,
  TripRoomMember,
  VoteType,
} from "@/lib/types";

export type GroupFitLabel =
  | "Best Group Fit"
  | "Strong Group Fit"
  | "Good Fit"
  | "Mixed Fit"
  | "Low Fit";

export type ConflictFlag =
  | "over_budget"
  | "month_mismatch"
  | "family_mismatch"
  | "adults_only_mismatch"
  | "rain_risk"
  | "few_deals"
  | "not_enough_votes";

export interface GroupFitResult {
  score: number;
  label: GroupFitLabel;
  explanation: string;
  conflicts: ConflictFlag[];
  pros: string[];
  cons: string[];
}

function labelFor(score: number): GroupFitLabel {
  if (score >= 90) return "Best Group Fit";
  if (score >= 80) return "Strong Group Fit";
  if (score >= 70) return "Good Fit";
  if (score >= 60) return "Mixed Fit";
  return "Low Fit";
}

const POSITIVE: VoteType[] = ["love", "interested"];
const NEGATIVE: VoteType[] = ["too_expensive", "bad_dates", "not_my_vibe"];

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function memberBudgets(room: TripRoom): number[] {
  const out: number[] = [];
  for (const m of room.members ?? []) {
    const b = m.preferences?.preferredBudgetPerPerson;
    if (typeof b === "number" && b > 0) out.push(b);
  }
  if (out.length === 0) out.push(room.budgetPerPerson);
  return out;
}

function preferredMonthsForGroup(room: TripRoom): number[] {
  const counts = new Map<number, number>();
  for (const m of room.members ?? []) {
    for (const mm of m.preferences?.preferredMonths ?? []) {
      counts.set(mm, (counts.get(mm) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, c]) => c >= Math.max(1, Math.ceil((room.members?.length ?? 1) / 2)))
    .map(([m]) => m);
}

function styleOverlap(room: TripRoom, vibes: string[]): number {
  if (vibes.length === 0) return 0;
  let hits = 0;
  let totalTags = 0;
  for (const m of room.members ?? []) {
    const tags = m.preferences?.travelStyleTags ?? [];
    if (tags.length === 0) continue;
    totalTags += tags.length;
    for (const t of tags) if (vibes.some((v) => v.toLowerCase() === t.toLowerCase())) hits++;
  }
  if (totalTags === 0) return 0;
  return hits / totalTags;
}

export function scoreDestinationForRoom(
  room: TripRoom,
  destination: Destination,
  deals: Deal[],
  votes: DestinationVote[],
): GroupFitResult {
  const conflicts: ConflictFlag[] = [];
  const pros: string[] = [];
  const cons: string[] = [];

  const destVotes = votes.filter((v) => v.destinationId === destination.id);
  const memberCount = Math.max(1, room.members?.length ?? room.memberNames.length);
  const positive = destVotes.filter((v) => POSITIVE.includes(v.voteType)).length;
  const negative = destVotes.filter((v) => NEGATIVE.includes(v.voteType)).length;
  const voteParticipation = destVotes.length / memberCount;

  // Vote interest signal (0-100)
  const interestScore = clamp(50 + (positive - negative) * (50 / memberCount));

  // Deal density / budget fit
  const destDeals = deals.filter((d) => d.destinationId === destination.id);
  const budgets = memberBudgets(room);
  const minBudget = Math.min(...budgets);
  const underBudget = destDeals.filter((d) => d.pricePerPerson <= minBudget).length;
  const budgetScore = destDeals.length === 0 ? 50 : clamp((underBudget / destDeals.length) * 100);
  if (destDeals.length === 0) conflicts.push("few_deals");
  else if (underBudget === 0) conflicts.push("over_budget");
  if (underBudget > 0) pros.push(`${underBudget} deal${underBudget > 1 ? "s" : ""} under group budget`);

  // Month alignment
  const prefMonths = preferredMonthsForGroup(room);
  let monthScore = 70;
  if (prefMonths.length > 0) {
    const overlap = prefMonths.filter((m) => destination.bestMonths.includes(m)).length;
    monthScore = clamp((overlap / prefMonths.length) * 100);
    if (overlap === 0) {
      conflicts.push("month_mismatch");
      cons.push("Group's preferred months are not the strongest weather window");
    } else {
      pros.push("Matches the group's preferred travel window");
    }
  }

  // Rain risk
  const rainOverlap = prefMonths.filter((m) => destination.rainyMonths.includes(m)).length;
  let weatherScore = 80;
  if (rainOverlap > 0) {
    weatherScore = clamp(80 - rainOverlap * 15);
    conflicts.push("rain_risk");
    cons.push("Rainy-season risk during preferred months");
  }

  // Adults-only / family alignment
  const adultsOnlyVotes = (room.members ?? []).filter((m) => m.preferences?.adultsOnlyPreference === "yes").length;
  const familyVotes = (room.members ?? []).filter((m) => m.preferences?.familyFriendlyPreference === "yes").length;
  let alignScore = 75;
  if (destDeals.length > 0) {
    const adultsAvail = destDeals.filter((d) => d.adultsOnly).length;
    const familyAvail = destDeals.filter((d) => d.familyFriendly).length;
    if (adultsOnlyVotes > 0 && adultsAvail === 0) {
      conflicts.push("adults_only_mismatch");
      cons.push("No adults-only resort matches at this destination");
      alignScore -= 20;
    }
    if (familyVotes > 0 && familyAvail === 0) {
      conflicts.push("family_mismatch");
      cons.push("Few family-friendly deals at this destination");
      alignScore -= 20;
    }
    if (adultsAvail > 0 || familyAvail > 0) alignScore += 10;
  }
  alignScore = clamp(alignScore);

  // Vibe / style overlap
  const vibeOverlap = styleOverlap(room, destination.vibeTags as unknown as string[]);
  const vibeScore = vibeOverlap > 0 ? clamp(60 + vibeOverlap * 40) : 60;
  if (vibeOverlap > 0.4) pros.push("Matches the group's travel-style vibe");

  if (voteParticipation < 0.34) conflicts.push("not_enough_votes");

  // Weighted blend
  const score = Math.round(
    interestScore * 0.30 +
    budgetScore * 0.25 +
    monthScore * 0.15 +
    weatherScore * 0.10 +
    alignScore * 0.10 +
    vibeScore * 0.10,
  );

  const label = labelFor(score);
  const explanation =
    `${destination.name} is rated ${label.toLowerCase()} by Azulva. ` +
    `${positive}/${memberCount} members are interested, ${underBudget} deal${underBudget !== 1 ? "s" : ""} fit the group's budget, ` +
    `${prefMonths.length > 0 ? `${Math.round(monthScore)}% month alignment` : "no shared month preferences yet"}, ` +
    `and ${conflicts.length === 0 ? "no major concerns" : `${conflicts.length} concern${conflicts.length > 1 ? "s" : ""}`} flagged.`;

  return { score, label, explanation, conflicts, pros, cons };
}

export function scoreDealForRoom(
  room: TripRoom,
  deal: Deal,
  votes: DealVote[],
): GroupFitResult {
  const conflicts: ConflictFlag[] = [];
  const pros: string[] = [];
  const cons: string[] = [];

  const memberCount = Math.max(1, room.members?.length ?? room.memberNames.length);
  const dealVotes = votes.filter((v) => v.tripRoomId === room.id && v.dealId === deal.id);
  const positive = dealVotes.filter((v) => POSITIVE.includes(v.voteType)).length;
  const negative = dealVotes.filter((v) => NEGATIVE.includes(v.voteType)).length;
  const participation = dealVotes.length / memberCount;

  const budgets = memberBudgets(room);
  const overBudgetMembers = budgets.filter((b) => b < deal.pricePerPerson).length;
  let budgetScore = 100;
  if (overBudgetMembers > 0) {
    budgetScore = clamp(100 - (overBudgetMembers / budgets.length) * 80);
    conflicts.push("over_budget");
    cons.push(`Over budget for ${overBudgetMembers}/${budgets.length} member${budgets.length > 1 ? "s" : ""}`);
  } else {
    pros.push("Within everyone's budget");
  }

  const interestScore = clamp(50 + (positive - negative) * (50 / memberCount));
  if (participation < 0.34) conflicts.push("not_enough_votes");

  const adultsOnlyVotes = (room.members ?? []).filter((m) => m.preferences?.adultsOnlyPreference === "yes").length;
  const familyVotes = (room.members ?? []).filter((m) => m.preferences?.familyFriendlyPreference === "yes").length;
  let alignScore = 75;
  if (adultsOnlyVotes > 0 && !deal.adultsOnly) {
    alignScore -= 15; conflicts.push("adults_only_mismatch");
    cons.push("Some members want an adults-only resort");
  }
  if (familyVotes > 0 && !deal.familyFriendly) {
    alignScore -= 15; conflicts.push("family_mismatch");
    cons.push("Some members want family-friendly");
  }
  alignScore = clamp(alignScore);

  const score = Math.round(
    interestScore * 0.35 +
    budgetScore * 0.30 +
    alignScore * 0.15 +
    deal.dealScore * 0.20,
  );

  const label = labelFor(score);
  const explanation =
    `${positive}/${memberCount} members ${positive === 1 ? "is" : "are"} interested. ` +
    `${overBudgetMembers === 0 ? "Within group budget." : `Over budget for ${overBudgetMembers}.`} ` +
    `Deal score ${deal.dealScore}/100.`;

  return { score, label, explanation, conflicts, pros, cons };
}

export interface GroupSummary {
  topDestinationId: string | null;
  topDealId: string | null;
  biggestDisagreement: string | null;
  budgetWarning: string | null;
  nextAction: string;
}

export function summarizeGroup(
  room: TripRoom,
  destinations: Destination[],
  deals: Deal[],
  dealVotes: DealVote[],
): GroupSummary {
  const destinationVotes = room.destinationVotes ?? [];
  const inRoomDests = destinations.filter((d) => room.destinationIds.includes(d.id));
  const inRoomDeals = deals.filter((d) => room.dealIds.includes(d.id));

  const destScores = inRoomDests.map((d) => ({
    dest: d, fit: scoreDestinationForRoom(room, d, deals, destinationVotes),
  })).sort((a, b) => b.fit.score - a.fit.score);

  const dealScores = inRoomDeals.map((d) => ({
    deal: d, fit: scoreDealForRoom(room, d, dealVotes),
  })).sort((a, b) => b.fit.score - a.fit.score);

  const top = destScores[0];
  let biggest: string | null = null;
  let maxSplit = 0;
  for (const d of inRoomDests) {
    const votes = destinationVotes.filter((v) => v.destinationId === d.id);
    const pos = votes.filter((v) => POSITIVE.includes(v.voteType)).length;
    const neg = votes.filter((v) => NEGATIVE.includes(v.voteType)).length;
    const split = Math.min(pos, neg);
    if (split > maxSplit) { maxSplit = split; biggest = d.name; }
  }

  const budgets = memberBudgets(room);
  const minBudget = Math.min(...budgets);
  const cheapestDealInRoom = inRoomDeals.length ? Math.min(...inRoomDeals.map((d) => d.pricePerPerson)) : null;
  const budgetWarning = cheapestDealInRoom !== null && cheapestDealInRoom > minBudget
    ? `Cheapest tracked deal ($${cheapestDealInRoom}/pp) exceeds the lowest member budget ($${minBudget}/pp).`
    : null;

  let nextAction = "Add a destination or deal to start gathering group input.";
  if (top && dealScores[0]) {
    nextAction = `Compare top deals at ${top.dest.name} or create a Deal Watch for the group's window.`;
  } else if (top) {
    nextAction = `Add a deal for ${top.dest.name} or create a Deal Watch to capture matches.`;
  } else if (dealScores[0]) {
    nextAction = "Suggest a destination so the group can compare options before committing.";
  }

  return {
    topDestinationId: top?.dest.id ?? null,
    topDealId: dealScores[0]?.deal.id ?? null,
    biggestDisagreement: biggest && maxSplit > 0 ? biggest : null,
    budgetWarning,
    nextAction,
  };
}

export function conflictLabel(c: ConflictFlag): string {
  switch (c) {
    case "over_budget": return "Over budget";
    case "month_mismatch": return "Dates mismatch";
    case "family_mismatch": return "Family mismatch";
    case "adults_only_mismatch": return "Adults-only mismatch";
    case "rain_risk": return "Rain risk";
    case "few_deals": return "Few deals";
    case "not_enough_votes": return "Need more votes";
  }
}

export type { TripRoomMember };
