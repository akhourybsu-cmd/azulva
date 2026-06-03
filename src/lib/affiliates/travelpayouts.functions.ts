// Server-side Travelpayouts affiliate provider.
// Real-provider scaffold. If TRAVELPAYOUTS_TOKEN + TRAVELPAYOUTS_MARKER are
// missing we return a graceful `not_configured` state. The current
// fallback append-marker strategy stays so admins can verify outbound
// attribution end-to-end before the partner-link API is fully wired.
//
// When ready to call the real Travelpayouts Partner Links API, drop the
// call into the `try` block below and set `provider: "travelpayouts_partner_link"`.
// The shape of this fn (input + return) is the stable contract that
// AffiliateLinkService and the admin batch-generation flow rely on.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  sourceUrl: z.string().url().max(2048),
  // Optional SubID context. Never include personal data here.
  subIds: z
    .object({
      sourceSlug: z.string().max(64).optional(),
      dealId: z.string().max(128).optional(),
      destinationSlug: z.string().max(64).optional(),
      referrerRoute: z.string().max(128).optional(),
      tripRoomId: z.string().max(64).optional(),
      watchlistId: z.string().max(64).optional(),
      anonymous: z.boolean().optional(),
    })
    .optional(),
});

export type AffiliateGenReason =
  | "ok"
  | "not_configured"
  | "unsupported_host"
  | "provider_error"
  | "invalid_url";

export type AffiliateGenResult = {
  affiliateUrl: string | null;
  provider: string;
  reason: AffiliateGenReason;
  /** Short message for admin UI. Never contains secrets. */
  status?: string;
};

export const generateTravelpayoutsAffiliateLink = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<AffiliateGenResult> => {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    const marker = process.env.TRAVELPAYOUTS_MARKER;
    if (!token || !marker) {
      return {
        affiliateUrl: null,
        provider: "travelpayouts",
        reason: "not_configured",
        status: "Travelpayouts token and/or marker are not configured.",
      };
    }
    let u: URL;
    try {
      u = new URL(data.sourceUrl);
    } catch {
      return { affiliateUrl: null, provider: "travelpayouts", reason: "invalid_url" };
    }
    try {
      // Fallback partner-link strategy until the official Partner Links API
      // is integrated: attach the marker and an opaque sub_id payload so we
      // can trace clicks back to a deal/source/destination/referrer combo.
      u.searchParams.set("marker", marker);
      const sub = data.subIds;
      if (sub) {
        const subId = [
          sub.sourceSlug && `s.${sub.sourceSlug}`,
          sub.dealId && `d.${sub.dealId}`,
          sub.destinationSlug && `x.${sub.destinationSlug}`,
          sub.referrerRoute && `r.${sub.referrerRoute.replace(/[^a-z0-9_-]/gi, "_")}`,
          sub.tripRoomId && `t.${sub.tripRoomId}`,
          sub.watchlistId && `w.${sub.watchlistId}`,
          sub.anonymous != null && `u.${sub.anonymous ? "anon" : "auth"}`,
        ]
          .filter(Boolean)
          .join("|")
          .slice(0, 200);
        if (subId) u.searchParams.set("sub_id", subId);
      }
      return {
        affiliateUrl: u.toString(),
        provider: "travelpayouts",
        reason: "ok",
        status: "Marker + sub_id attached (fallback strategy; Partner Link API pending).",
      };
    } catch {
      return {
        affiliateUrl: null,
        provider: "travelpayouts",
        reason: "provider_error",
        status: "Provider failed to generate a link.",
      };
    }
  });
