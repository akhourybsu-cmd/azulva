// Returns provider configuration status without ever exposing secrets to
// the client. Used by the admin Affiliate Setup panel.
import { createServerFn } from "@tanstack/react-start";

export const getAffiliateProviderStatus = createServerFn({ method: "GET" }).handler(async () => {
  return {
    travelpayouts: {
      tokenConfigured: !!process.env.TRAVELPAYOUTS_TOKEN,
      markerConfigured: !!process.env.TRAVELPAYOUTS_MARKER,
      projectIdConfigured: !!process.env.TRAVELPAYOUTS_PROJECT_ID,
    },
  };
});
