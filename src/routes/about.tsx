import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
export const Route = createFileRoute("/about")({ component: () => (
  <AppShell><h1 className="font-display text-3xl">About</h1>
    <p className="mt-3 max-w-2xl text-muted-foreground">Azulva helps friend groups find, watch, compare, and choose better all-inclusive trips. We don't process bookings — we send you to trusted partners with transparent scoring.</p>
  </AppShell>
)});
