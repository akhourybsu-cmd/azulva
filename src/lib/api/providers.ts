// Provider adapters. Each fails gracefully when keys are missing.
// All secret keys should be read from process.env inside server-side handlers ONLY.
// Browser code calls these via server functions. For MVP, these expose stub methods.

import type { BaseProvider, ProviderHealth } from "./ProviderTypes";
import { ApiHealth } from "./ApiHealth";

function makeStub(name: string, hasKeyEnv?: string): BaseProvider {
  return {
    name,
    isConfigured() {
      if (!hasKeyEnv) return true; // keyless provider
      if (typeof process === "undefined") return false;
      return Boolean(process.env?.[hasKeyEnv]);
    },
    async health(): Promise<ProviderHealth> {
      const configured = this.isConfigured();
      const h: ProviderHealth = {
        providerName: name,
        status: configured ? "ok" : "missing_key",
        message: configured ? "Stub configured — replace with live calls." : `Missing ${hasKeyEnv}`,
        lastCheckedAt: new Date().toISOString(),
      };
      ApiHealth.record(h);
      return h;
    },
  };
}

// TODO: Implement against https://developers.amadeus.com/self-service
export const AmadeusProvider = makeStub("Amadeus", "AMADEUS_CLIENT_ID");
// TODO: Implement against https://www.travelpayouts.com/developers
export const TravelpayoutsProvider = makeStub("Travelpayouts", "TRAVELPAYOUTS_TOKEN");
// Keyless https://open-meteo.com/
export const OpenMeteoProvider = makeStub("Open-Meteo");
// TODO https://opentripmap.io/
export const OpenTripMapProvider = makeStub("OpenTripMap", "OPENTRIPMAP_API_KEY");
// Keyless https://restcountries.com/
export const RestCountriesProvider = makeStub("REST Countries");
// Keyless https://www.frankfurter.app/
export const CurrencyProvider = makeStub("Frankfurter");
// Keyed https://www.pexels.com/api/ or https://unsplash.com/developers
export const ImageProvider = makeStub("Pexels/Unsplash", "PEXELS_API_KEY");
// Keyless https://nominatim.org/ - respect usage limits and CACHE results.
export const GeocodingProvider = makeStub("Nominatim");

export const allProviders = [
  AmadeusProvider, TravelpayoutsProvider, OpenMeteoProvider,
  OpenTripMapProvider, RestCountriesProvider, CurrencyProvider,
  ImageProvider, GeocodingProvider,
];
