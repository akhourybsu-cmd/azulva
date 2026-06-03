import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAllDeals, useStore, storeActions } from "@/lib/store";
import { Users, Plus, Heart, ThumbsUp, DollarSign, Calendar, HelpCircle, X } from "lucide-react";
import { useState } from "react";
import type { VoteType, TripRoom } from "@/lib/types";

export const Route = createFileRoute("/trips")({
  head: () => ({ meta: [{ title: "Trip Rooms — All-Inclusive Scout" }] }),
  component: TripsPage,
});

const VOTE_OPTIONS: { type: VoteType; label: string; icon: React.ReactNode }[] = [
  { type: "love", label: "Love it", icon: <Heart className="h-3.5 w-3.5" /> },
  { type: "interested", label: "Interested", icon: <ThumbsUp className="h-3.5 w-3.5" /> },
  { type: "too_expensive", label: "Too $$$", icon: <DollarSign className="h-3.5 w-3.5" /> },
  { type: "bad_dates", label: "Bad dates", icon: <Calendar className="h-3.5 w-3.5" /> },
  { type: "not_my_vibe", label: "Not vibe", icon: <X className="h-3.5 w-3.5" /> },
  { type: "need_info", label: "Need info", icon: <HelpCircle className="h-3.5 w-3.5" /> },
];

function TripsPage() {
  const s = useStore();
  const deals = useAllDeals();
  const [showNew, setShowNew] = useState(false);

  return (
    <AppShell>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Trip Rooms</h1>
          <p className="text-muted-foreground">Plan together. Vote together. Book together.</p>
        </div>
        <button onClick={() => setShowNew((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm text-background"><Plus className="h-4 w-4" /> New room</button>
      </header>

      {showNew && <NewRoomForm onDone={() => setShowNew(false)} />}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {s.tripRooms.map((t) => {
          const roomDeals = deals.filter((d) => t.dealIds.includes(d.id));
          const roomVotes = s.votes.filter((v) => v.tripRoomId === t.id);
          return (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-xl">{t.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">{t.tripType}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {t.groupSize} ppl · ${t.budgetPerPerson}/pp · invite <span className="font-mono">{t.inviteCode}</span>
              </div>

              <div className="mt-4 space-y-3">
                {roomDeals.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No deals added yet. Add some from the Deals feed.</div>
                ) : roomDeals.map((d) => {
                  const dealVotes = roomVotes.filter((v) => v.dealId === d.id);
                  const loves = dealVotes.filter((v) => v.voteType === "love").length;
                  const score = Math.round((loves / Math.max(1, t.memberNames.length)) * 100);
                  return (
                    <div key={d.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <Link to="/deals/$dealId" params={{ dealId: d.id }} className="min-w-0 flex-1 hover:underline">
                          <div className="truncate text-sm font-semibold">{d.title}</div>
                          <div className="text-xs text-muted-foreground">${d.pricePerPerson}/pp · score {d.dealScore}</div>
                        </Link>
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Group fit</div>
                          <div className="font-display text-xl">{score}</div>
                        </div>
                      </div>
                      {d.pricePerPerson > t.budgetPerPerson && (
                        <div className="mt-2 rounded bg-[var(--warning)]/15 px-2 py-1 text-[10px] font-semibold text-[var(--warning)]">⚠️ Over budget by ${d.pricePerPerson - t.budgetPerPerson}/pp</div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {VOTE_OPTIONS.map((vo) => {
                          const count = dealVotes.filter((v) => v.voteType === vo.type).length;
                          return (
                            <button key={vo.type}
                              onClick={() => storeActions.recordVote({ id: crypto.randomUUID(), tripRoomId: t.id, dealId: d.id, userId: "me", userName: "You", voteType: vo.type, createdAt: new Date().toISOString() })}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] hover:bg-muted">
                              {vo.icon} {vo.label} {count > 0 && <span className="rounded-full bg-foreground px-1.5 text-background">{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function NewRoomForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState(1500);
  const [size, setSize] = useState(4);
  const [type, setType] = useState<TripRoom["tripType"]>("friends");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        storeActions.addTripRoom({
          id: crypto.randomUUID(), ownerId: "me", name: name || "New trip",
          budgetPerPerson: budget, groupSize: size, homeAirports: ["BOS"],
          preferredDestinations: [], tripType: type,
          inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
          memberNames: ["You"], dealIds: [], createdAt: new Date().toISOString(),
        });
        onDone();
      }}
      className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4"
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trip name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2" />
      <input type="number" value={budget} onChange={(e) => setBudget(+e.target.value)} placeholder="Budget/pp" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <input type="number" value={size} onChange={(e) => setSize(+e.target.value)} placeholder="Group size" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <select value={type} onChange={(e) => setType(e.target.value as TripRoom["tripType"])} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
        {(["friends","couples","family","bachelor","bachelorette"] as const).map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <button className="rounded-lg bg-foreground py-2 text-sm font-semibold text-background sm:col-span-3">Create room</button>
    </form>
  );
}
