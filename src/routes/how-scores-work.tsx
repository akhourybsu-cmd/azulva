import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/how-scores-work")({
  head: () => ({ meta: [{ title: "How Deal Scores Work — All-Inclusive Scout" }] }),
  component: () => (
    <AppShell>
      <h1 className="font-display text-3xl md:text-4xl">How Deal Scores work</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Every deal gets a 0–100 Deal Score based on a weighted blend of seven signals. We show the breakdown on every deal so you can decide for yourself.</p>
      <ul className="mt-6 max-w-2xl space-y-2 text-sm">
        <li><b>Price value · 30%</b> — how the price compares to typical for similar trips.</li>
        <li><b>Resort quality · 20%</b> — guest reviews + star rating.</li>
        <li><b>Flight convenience · 15%</b> — included, nonstop, time of day.</li>
        <li><b>All-inclusive confidence · 10%</b> — how sure we are about what's included.</li>
        <li><b>Group fit · 10%</b> — how well it matches your group's preferences.</li>
        <li><b>Flexibility · 10%</b> — refundability and cancellation window.</li>
        <li><b>Urgency · 5%</b> — recent price drops or close departure dates.</li>
      </ul>
      <p className="mt-6 max-w-2xl text-xs text-muted-foreground">Scores are advisory only. Always verify pricing and inclusions with the booking partner before purchase.</p>
    </AppShell>
  ),
});
