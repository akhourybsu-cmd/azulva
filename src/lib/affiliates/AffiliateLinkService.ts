// Client-safe affiliate link service.
// Generation happens server-side (Travelpayouts token never leaks to the
// browser). The first iteration is admin/manual-first with a stub provider.
import { generateTravelpayoutsAffiliateLink } from "./travelpayouts.functions";

export type AffiliateGenResult = {
  affiliateUrl: string | null;
  provider: string;
  reason?: "no_token" | "unsupported_host" | "error" | "ok";
};

/**
 * Attempt to convert a direct source URL into an affiliate link.
 * Returns `{ affiliateUrl: null }` if no provider can handle the URL or no
 * token is configured. UI should fall back to the direct source URL or the
 * manually-entered affiliate URL.
 */
export async function tryGenerateAffiliateLink(sourceUrl: string): Promise<AffiliateGenResult> {
  if (!sourceUrl) return { affiliateUrl: null, provider: "none", reason: "error" };
  try {
    const res = await generateTravelpayoutsAffiliateLink({ data: { sourceUrl } });
    return res;
  } catch {
    return { affiliateUrl: null, provider: "travelpayouts", reason: "error" };
  }
}

export type AffiliateUrlState =
  | { kind: "none" }
  | { kind: "direct"; url: string }
  | { kind: "manual_affiliate"; url: string; sourceUrl?: string }
  | { kind: "generated_affiliate"; url: string; sourceUrl?: string };

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
