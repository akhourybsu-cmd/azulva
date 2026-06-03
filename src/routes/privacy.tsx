import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
export const Route = createFileRoute("/privacy")({ component: () => (
  <AppShell><h1 className="font-display text-3xl">Privacy Policy</h1><p className="mt-3 text-muted-foreground">Placeholder.</p></AppShell>
)});
