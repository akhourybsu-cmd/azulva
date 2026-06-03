// Core domain types for Azulva

export type SourceLabel =
  | "Curated Deal"
  | "Sample Deal"
  | "Amadeus Test"
  | "Travelpayouts"
  | "Open-Meteo"
  | "OpenTripMap"
  | "REST Countries"
  | "Pexels"
  | "Unsplash";

export type AllInclusiveConfidence =
  | "Confirmed"
  | "Likely"
  | "Unclear"
  | "Not Included"
  | "Unknown";

export type DealScoreLabel =
  | "Excellent Deal"
  | "Strong Deal"
  | "Good Deal"
  | "Fair Deal"
  | "Watch Only";

export type InclusionState = "included" | "not_included" | "unknown" | "warning";

export type VibeTag =
  | "Party" | "Relaxing" | "Luxury" | "Family"
  | "Couples" | "Adventure" | "Budget";

export interface Destination {
  id: string;
  name: string;
  slug: string;
  country: string;
  countryCode: string; // ISO-2
  region: string;
  latitude: number;
  longitude: number;
  currencyCode: string;
  languageCodes: string[];
  passportRequiredForUsTravelers: boolean;
  description: string;
  vibeTags: VibeTag[];
  bestMonths: number[];
  rainyMonths: number[];
  imageUrl: string;
  imageAttribution: string;
  avgFlightHoursFromBOS?: number;
  source: SourceLabel;
}

export interface Resort {
  id: string;
  name: string;
  slug: string;
  destinationId: string;
  starRating: number;
  guestRating: number; // 0-10
  reviewCount: number;
  adultsOnly: boolean;
  familyFriendly: boolean;
  allInclusiveConfidence: AllInclusiveConfidence;
  amenities: string[];
  description: string;
  imageUrl: string;
  source: SourceLabel;
}

export interface Deal {
  id: string;
  title: string;
  resortId: string;
  destinationId: string;
  sourceLabel: SourceLabel;
  sourceUrl: string;
  affiliateUrl?: string;
  departureAirport: string;
  arrivalAirport: string;
  startDate: string; // ISO
  endDate: string;
  nights: number;
  pricePerPerson: number;
  totalPriceEstimate?: number;
  currencyCode: string;
  flightIncluded: InclusionState;
  transfersIncluded: InclusionState;
  checkedBagsIncluded: InclusionState;
  foodAndDrinksIncluded: InclusionState;
  hotelIncluded: InclusionState;
  refundable: InclusionState;
  roomType: string;
  mealPlan: string;
  adultsOnly: boolean;
  familyFriendly: boolean;
  cancellationNotes?: string;
  dealScore: number;
  dealScoreLabel: DealScoreLabel;
  dealScoreExplanation: string;
  priceValueScore: number;
  resortQualityScore: number;
  flightConvenienceScore: number;
  allInclusiveConfidenceScore: number;
  groupFitScore: number;
  flexibilityScore: number;
  urgencyScore: number;
  allInclusiveConfidence: AllInclusiveConfidence;
  status: "active" | "expiring" | "expired";
  lastCheckedAt: string;
  expiresAt?: string;
  aiSummary?: string;
}

export interface PriceSnapshot {
  id: string;
  dealId: string;
  pricePerPerson: number;
  capturedAt: string;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  homeAirport: string;
  backupAirports: string[];
  destinations: string[] | "Anywhere";
  dateStart?: string;
  dateEnd?: string;
  flexibleDates: boolean;
  minNights: number;
  maxNights: number;
  maxPricePerPerson: number;
  adultsOnlyRequired: boolean;
  familyFriendlyRequired: boolean;
  minimumResortRating: number;
  nonstopPreferred: boolean;
  flightIncludedRequired: boolean;
  transfersPreferred: boolean;
  minimumDealScore: number;
  alertFrequency: "instant" | "daily" | "weekly";
  enabled: boolean;
  createdAt: string;
}

export type VoteType =
  | "love" | "interested" | "too_expensive"
  | "bad_dates" | "not_my_vibe" | "need_info";

export interface DealVote {
  id: string;
  tripRoomId: string;
  dealId: string;
  userId: string;
  userName: string;
  voteType: VoteType;
  comment?: string;
  createdAt: string;
}

export interface TripRoom {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  desiredDateStart?: string;
  desiredDateEnd?: string;
  budgetPerPerson: number;
  groupSize: number;
  homeAirports: string[];
  preferredDestinations: string[];
  tripType: "friends" | "couples" | "family" | "bachelor" | "bachelorette";
  inviteCode: string;
  memberNames: string[];
  dealIds: string[];
  createdAt: string;
}

export interface OutboundClick {
  id: string;
  dealId: string;
  outboundUrl: string;
  clickedAt: string;
}
