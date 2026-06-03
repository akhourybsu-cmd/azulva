import { Link } from "@tanstack/react-router";
import { Compass, Heart, MapPin, Sparkles, Users, User, Shield } from "lucide-react";

const navItems = [
  { to: "/", label: "Deals", icon: Sparkles },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/watchlist", label: "Watchlist", icon: Heart },
  { to: "/trips", label: "Trips", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--ocean)] to-[var(--coral)] text-primary-foreground shadow-sm">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold">Azulva</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Beach trips, agreed on together.</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to} to={to}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium bg-foreground text-background" }}
                activeOptions={{ exact: to === "/" }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <Link to="/admin" className="ml-2 flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted">
              <Shield className="h-3.5 w-3.5" /> Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to} to={to}
              className="flex flex-col items-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
              activeProps={{ className: "flex flex-col items-center gap-1 py-2 text-[10px] font-medium text-foreground" }}
              activeOptions={{ exact: to === "/" }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-muted/30 py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-6 md:grid-cols-4 text-sm">
            <div>
              <div className="font-display text-lg">Azulva</div>
              <p className="mt-2 text-muted-foreground">Find the all-inclusive trip everyone actually agrees on.</p>
            </div>
            <div>
              <div className="font-semibold mb-2">Product</div>
              <ul className="space-y-1 text-muted-foreground">
                <li><Link to="/explore">Explore</Link></li>
                <li><Link to="/watchlist">Watchlists</Link></li>
                <li><Link to="/trips">Trip Rooms</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Company</div>
              <ul className="space-y-1 text-muted-foreground">
                <li><Link to="/about">About</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/how-scores-work">How the Azulva Score works</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Legal</div>
              <ul className="space-y-1 text-muted-foreground">
                <li><Link to="/privacy">Privacy</Link></li>
                <li><Link to="/terms">Terms</Link></li>
                <li><Link to="/affiliate-disclosure">Affiliate Disclosure</Link></li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            Some links may be affiliate links. We may earn a commission if you book through them, at no additional cost to you. Prices and availability are not guaranteed — always verify with the booking partner before purchase.
          </p>
        </div>
      </footer>
    </div>
  );
}
