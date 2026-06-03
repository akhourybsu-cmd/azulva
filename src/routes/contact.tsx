import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
export const Route = createFileRoute("/contact")({ component: () => (
  <AppShell><h1 className="font-display text-3xl">Contact</h1>
    <p className="mt-3 text-muted-foreground">hello@allinclusivescout.example</p>
  </AppShell>
)});
