// Server-side Travelpayouts affiliate provider.
// Stub implementation: if TRAVELPAYOUTS_TOKEN + TRAVELPAYOUTS_MARKER are set,
// we attach the marker as a query param so admins can verify outbound
// attribution. Real TP redirect generation can be added later without
// changing call sites.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ sourceUrl: z.string().url().max(2048) });

export const generateTravelpayoutsAffiliateLink = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    const marker = process.env.TRAVELPAYOUTS_MARKER;
    if (!token || !marker) {
      return { affiliateUrl: null, provider: "travelpayouts", reason: "no_token" as const };
    }
    try {
      const u = new URL(data.sourceUrl);
      // Lightweight attribution: append marker. Real TP partner-link
      // generation requires its own redirect domain; this keeps a working
      // outbound URL while signalling attribution intent.
      u.searchParams.set("marker", marker);
      return { affiliateUrl: u.toString(), provider: "travelpayouts", reason: "ok" as const };
    } catch {
      return { affiliateUrl: null, provider: "travelpayouts", reason: "error" as const };
    }
  });
