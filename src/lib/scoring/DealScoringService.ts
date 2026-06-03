import type { Deal, DealScoreLabel } from "../types";

export function labelForScore(score: number): DealScoreLabel {
  if (score >= 90) return "Excellent Deal";
  if (score >= 80) return "Strong Deal";
  if (score >= 70) return "Good Deal";
  if (score >= 60) return "Fair Deal";
  return "Watch Only";
}

interface ScoreInputs {
  pricePerPerson: number;
  benchmarkPrice: number; // typical price for similar trip
  resortGuestRating: number; // 0-10
  resortStarRating: number; // 0-5
  nights: number;
  flightIncluded: boolean;
  nonstopLikely: boolean;
  allInclusiveConfidence: "Confirmed" | "Likely" | "Unclear" | "Not Included" | "Unknown";
  refundable: boolean;
  daysUntilDeparture: number;
  recentPriceDropPct?: number; // 0-1
  groupFit?: number; // 0-100 from group-fit service
}

export interface ScoreBreakdown {
  dealScore: number;
  dealScoreLabel: DealScoreLabel;
  priceValueScore: number;
  resortQualityScore: number;
  flightConvenienceScore: number;
  allInclusiveConfidenceScore: number;
  groupFitScore: number;
  flexibilityScore: number;
  urgencyScore: number;
  dealScoreExplanation: string;
}

export function calculateDealScore(i: ScoreInputs): ScoreBreakdown {
  // Price value: cheaper than benchmark = higher score
  const priceRatio = i.benchmarkPrice > 0 ? i.pricePerPerson / i.benchmarkPrice : 1;
  const priceValueScore = clamp(100 - (priceRatio - 0.7) * 200, 0, 100);

  // Resort quality: blend guest + star ratings
  const resortQualityScore = clamp(i.resortGuestRating * 8 + i.resortStarRating * 4, 0, 100);

  // Flight convenience
  let flightConvenienceScore = 50;
  if (i.flightIncluded) flightConvenienceScore += 30;
  if (i.nonstopLikely) flightConvenienceScore += 20;
  flightConvenienceScore = clamp(flightConvenienceScore, 0, 100);

  // All-inclusive confidence
  const aiMap = { Confirmed: 100, Likely: 75, Unclear: 40, "Not Included": 10, Unknown: 30 };
  const allInclusiveConfidenceScore = aiMap[i.allInclusiveConfidence];

  // Group fit
  const groupFitScore = i.groupFit ?? 70;

  // Flexibility
  const flexibilityScore = i.refundable ? 90 : 40;

  // Urgency: recent price drop or close departure
  let urgencyScore = 30;
  if (i.recentPriceDropPct && i.recentPriceDropPct > 0.05)
    urgencyScore += i.recentPriceDropPct * 200;
  if (i.daysUntilDeparture < 30) urgencyScore += 30;
  urgencyScore = clamp(urgencyScore, 0, 100);

  const dealScore = Math.round(
    priceValueScore * 0.3 +
    resortQualityScore * 0.2 +
    flightConvenienceScore * 0.15 +
    allInclusiveConfidenceScore * 0.1 +
    groupFitScore * 0.1 +
    flexibilityScore * 0.1 +
    urgencyScore * 0.05
  );

  const dealScoreLabel = labelForScore(dealScore);

  const parts: string[] = [];
  if (priceValueScore >= 75) parts.push("priced well below typical");
  else if (priceValueScore < 50) parts.push("priced above typical");
  if (resortQualityScore >= 80) parts.push("highly rated resort");
  if (flightConvenienceScore >= 80) parts.push("flights included");
  if (allInclusiveConfidenceScore < 60) parts.push("all-inclusive status should be verified");
  if (flexibilityScore < 60) parts.push("non-refundable");
  if (urgencyScore >= 70) parts.push("recent price movement");

  const dealScoreExplanation = parts.length
    ? `This deal scores ${dealScore} because it is ${parts.join(", ")}.`
    : `This deal scores ${dealScore} based on average signals across price, quality, and convenience.`;

  return {
    dealScore,
    dealScoreLabel,
    priceValueScore: Math.round(priceValueScore),
    resortQualityScore: Math.round(resortQualityScore),
    flightConvenienceScore: Math.round(flightConvenienceScore),
    allInclusiveConfidenceScore: Math.round(allInclusiveConfidenceScore),
    groupFitScore: Math.round(groupFitScore),
    flexibilityScore: Math.round(flexibilityScore),
    urgencyScore: Math.round(urgencyScore),
    dealScoreExplanation,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function recomputeDealScore(deal: Deal, benchmarkPrice: number, resortGuestRating: number, resortStarRating: number) {
  const days = Math.max(1, (new Date(deal.startDate).getTime() - Date.now()) / 86400000);
  return calculateDealScore({
    pricePerPerson: deal.pricePerPerson,
    benchmarkPrice,
    resortGuestRating,
    resortStarRating,
    nights: deal.nights,
    flightIncluded: deal.flightIncluded === "included",
    nonstopLikely: true,
    allInclusiveConfidence: deal.allInclusiveConfidence,
    refundable: deal.refundable === "included",
    daysUntilDeparture: days,
  });
}
