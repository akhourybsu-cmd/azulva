// Client-safe affiliate link service.
// Generation happens server-side (Travelpayouts token never leaks to the
// browser). Manual curated deals remain the source of truth — generated
// links are layered on top with strict precedence.
import {
  generateTravelpayoutsAffiliateLink,
  type AffiliateGenResult,
  type AffiliateGenReason,
} from "./travelpayouts.functions";

export type { AffiliateGenResult, AffiliateGenReason };

export type AffiliateSubIds = {
  sourceSlug?: string;
  dealId?: string;
  destinationSlug?: string;
  referrerRoute?: string;
  tripRoomId?: string;
  watchlistId?: string;
  anonymous?: boolean;
};

/**
 * Attempt to convert a direct source URL into a partner link. UI should
 * fall back to the manually-entered affiliate URL or the direct source URL
 * when this returns `affiliateUrl: null`.
 */
export async function tryGenerateAffiliateLink(
  sourceUrl: string,
  subIds?: AffiliateSubIds,
): Promise<AffiliateGenResult> {
  if (!sourceUrl) {
    return { affiliateUrl: null, provider: "none", reason: "invalid_url" };
  }
  try {
    return await generateTravelpayoutsAffiliateLink({
      data: { sourceUrl, subIds },
    });
  } catch {
    return {
      affiliateUrl: null,
      provider: "travelpayouts",
      reason: "provider_error",
      status: "Network or runtime error contacting the affiliate provider.",
    };
  }
}

export type AffiliateUrlStateKind =
  | "none"
  | "direct"
  | "manual_affiliate"
  | "generated_affiliate"
  | "not_configured"
  | "source_not_affiliate_ready"
  | "generation_failed";

export type AffiliateUrlState =
  | { kind: "none" }
  | { kind: "direct"; url: string }
  | { kind: "manual_affiliate"; url: string; sourceUrl?: string }
  | { kind: "generated_affiliate"; url: string; sourceUrl?: string }
  | { kind: "not_configured"; sourceUrl?: string }
  | { kind: "source_not_affiliate_ready"; sourceUrl?: string }
  | { kind: "generation_failed"; sourceUrl?: string };

/**
 * Resolve which outbound URL the user-facing CTA should use.
 * Precedence: generated > manual > direct.
 */
export function describeAffiliateState(
  sourceUrl?: string | null,
  affiliateUrl?: string | null,
  generatedAffiliateUrl?: string | null,
): AffiliateUrlState {
  if (generatedAffiliateUrl) {
    return { kind: "generated_affiliate", url: generatedAffiliateUrl, sourceUrl: sourceUrl ?? undefined };
  }
  if (affiliateUrl) {
    return { kind: "manual_affiliate", url: affiliateUrl, sourceUrl: sourceUrl ?? undefined };
  }
  if (sourceUrl) return { kind: "direct", url: sourceUrl };
  return { kind: "none" };
}

/**
 * Admin-facing readiness label. Independent of which URL the CTA picks —
 * this describes the *generation/affiliate* posture for a deal.
 */
export function describeAffiliateReadiness(opts: {
  sourceUrl?: string | null;
  affiliateUrl?: string | null;
  generatedAffiliateUrl?: string | null;
  sourceAffiliateSupported?: boolean | null;
  providerConfigured?: boolean | null;
  lastGenerationReason?: AffiliateGenReason | null;
}): { kind: AffiliateUrlStateKind; label: string } {
  if (opts.generatedAffiliateUrl) {
    return { kind: "generated_affiliate", label: "Generated affiliate link available" };
  }
  if (opts.affiliateUrl) {
    return { kind: "manual_affiliate", label: "Manual affiliate link available" };
  }
  if (opts.lastGenerationReason === "provider_error" || opts.lastGenerationReason === "unsupported_host") {
    return { kind: "generation_failed", label: "Link generation failed" };
  }
  if (opts.sourceAffiliateSupported === false) {
    return { kind: "source_not_affiliate_ready", label: "Source not affiliate-ready" };
  }
  if (opts.providerConfigured === false) {
    return { kind: "not_configured", label: "Affiliate generation not configured" };
  }
  if (opts.sourceUrl) return { kind: "direct", label: "Direct source URL only" };
  return { kind: "none", label: "No outbound URL available" };
}

export const AFFILIATE_HELPER_TEXT = [
  "Generated affiliate links are used first.",
  "Manual affiliate URLs are preserved and used when no generated link exists.",
  "Direct source URLs are used only when no affiliate URL is available.",
  "Always verify that the source allows affiliate/deep-link usage before publishing.",
] as const;
