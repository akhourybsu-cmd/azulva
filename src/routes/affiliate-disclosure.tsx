import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
export const Route = createFileRoute("/affiliate-disclosure")({ component: () => (
  <AppShell><h1 className="font-display text-3xl">Affiliate Disclosure</h1>
    <p className="mt-3 max-w-2xl text-muted-foreground">Some links on All-Inclusive Scout may be affiliate links. We may earn a commission if you book through them, at no additional cost to you. Affiliate relationships never affect Deal Scores.</p>
  </AppShell>
)});
