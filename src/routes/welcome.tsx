import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/LandingPage";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Azulva — Find the all-inclusive trip everyone agrees on" },
      { name: "description", content: "Track resort deals, compare escapes, vote with friends, and know when a beach trip is worth booking. Join the Azulva early access waitlist." },
      { property: "og:title", content: "Azulva — All-inclusive trip deals, together" },
      { property: "og:description", content: "Curated all-inclusive resort deals, group voting, and transparent verification. Join the early access waitlist." },
    ],
  }),
  component: LandingPage,
});
