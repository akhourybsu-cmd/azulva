import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ViewDealButton } from "@/components/ViewDealButton";
import { useAllDeals, useStore, storeActions, getCurrentUserId } from "@/lib/store";
import { mockDestinations } from "@/lib/data/mockDestinations";
import {
  Users, Plus, Heart, ThumbsUp, DollarSign, Calendar, HelpCircle, X,
  MapPin, Sparkles, AlertTriangle, Trash2, Bell, Settings2, ChevronDown, ExternalLink,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { VoteType, TripRoom, TripRoomMemberPreferences } from "@/lib/types";
import {
  scoreDestinationForRoom,
  scoreDealForRoom,
  summarizeGroup,
  conflictLabel,
  type GroupFitResult,
} from "@/lib/scoring/GroupFitScoringService";

export const Route = createFileRoute("/trips")({
  head: () => ({ meta: [{ title: "Trip Rooms — Azulva" }] }),
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

function fitColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 70) return "var(--ocean)";
  if (score >= 60) return "var(--warning)";
  return "var(--destructive)";
}

function TripsPage() {
  const s = useStore();
  const deals = useAllDeals();
  const [showNew, setShowNew] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinState, setJoinState] = useState<{ kind: "idle" | "loading" | "ok" | "error"; msg?: string }>({ kind: "idle" });

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinState({ kind: "loading", msg: "Joining…" });
    const res = await storeActions.joinTripRoomByCode(joinCode);
    if (res.ok) {
      setJoinState({ kind: "ok", msg: "Joined! Your new room is below." });
      setJoinCode("");
    } else {
      setJoinState({ kind: "error", msg: res.error ?? "Couldn't join that room." });
    }
  }

  const empty = s.tripRooms.length === 0;

  return (
    <AppShell>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Trip Rooms</h1>
          <p className="text-muted-foreground">Where you'll go, together. Suggest, vote, decide.</p>
        </div>
        <button onClick={() => setShowNew((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm text-background">
          <Plus className="h-4 w-4" /> New room
        </button>
      </header>

      <form onSubmit={handleJoin} className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Have an invite code?</span>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="e.g. BACH-PC-25"
          className="flex-1 min-w-[160px] rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          disabled={joinState.kind === "loading"}
        />
        <button disabled={joinState.kind === "loading"} className="rounded-lg bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60">
          {joinState.kind === "loading" ? "Joining…" : "Join room"}
        </button>
        {joinState.msg && (
          <span className={`w-full text-xs ${
            joinState.kind === "ok" ? "text-[var(--success)]" :
            joinState.kind === "error" ? "text-destructive" :
            "text-muted-foreground"}`}>
            {joinState.msg}
          </span>
        )}
      </form>

      {showNew && <NewRoomForm onDone={() => setShowNew(false)} />}

      {empty ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-xl">No Trip Rooms yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Create a Trip Room or join one with an invite code. Suggest destinations, vote together, and surface the strongest group fit.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => setShowNew(true)} className="rounded-full bg-foreground px-4 py-2 text-sm text-background">Create a room</button>
            <button onClick={() => storeActions.createDemoTripRoom()} className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-muted">Load a sample room</button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        {s.tripRooms.map((t) => (
          <TripRoomCard key={t.id} room={t} allDeals={deals} />
        ))}
      </div>
    </AppShell>
  );
}

function TripRoomCard({ room, allDeals }: { room: TripRoom; allDeals: ReturnType<typeof useAllDeals> }) {
  const roomDeals = allDeals.filter((d) => room.dealIds.includes(d.id));
  const s = useStore();
  const roomVotes = s.votes.filter((v) => v.tripRoomId === room.id);
  const destVotes = room.destinationVotes ?? [];
  const roomDests = mockDestinations.filter((d) => room.destinationIds.includes(d.id));
  const [showPrefs, setShowPrefs] = useState(false);

  const summary = useMemo(
    () => summarizeGroup(room, mockDestinations, allDeals, roomVotes),
    [room, allDeals, roomVotes],
  );
  const topDest = roomDests.find((d) => d.id === summary.topDestinationId) ?? null;
  const topDeal = roomDeals.find((d) => d.id === summary.topDealId) ?? null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-display text-xl">{room.name}</div>
          {room.description && <div className="mt-0.5 text-xs text-muted-foreground">{room.description}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {room.memberNames.length || room.groupSize} ppl · ${room.budgetPerPerson}/pp · invite <span className="font-mono">{room.inviteCode}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">{room.tripType}</span>
          <button onClick={() => setShowPrefs((v) => !v)} className="rounded-full border border-border bg-card p-1.5 hover:bg-muted" aria-label="Your preferences">
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showPrefs && <MyPrefsEditor room={room} />}

      <GroupSummaryPanel
        topDestName={topDest?.name ?? null}
        topDealTitle={topDeal?.title ?? null}
        biggest={summary.biggestDisagreement}
        budgetWarning={summary.budgetWarning}
        nextAction={summary.nextAction}
      />

      {/* DESTINATION SHORTLIST */}
      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 font-display text-base">
            <MapPin className="h-4 w-4" /> Destination Shortlist · {roomDests.length}
          </h3>
        </div>
        {roomDests.length === 0 ? (
          <EmptyState
            title="Start with where, then find the deal."
            body="Suggest destinations your group is considering, vote on the vibe, then compare real trip options."
            cta={<Link to="/explore" className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background">Browse destinations</Link>}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {roomDests.map((d) => {
              const fit = scoreDestinationForRoom(room, d, allDeals, destVotes);
              const hot = allDeals.filter((x) => x.destinationId === d.id).length;
              const votes = destVotes.filter((v) => v.destinationId === d.id);
              return (
                <DestinationShortlistCard
                  key={d.id}
                  dest={d}
                  roomId={room.id}
                  fit={fit}
                  hotDealCount={hot}
                  votes={votes}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* DEAL SHORTLIST */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 font-display text-base">
            <Sparkles className="h-4 w-4" /> Deal Shortlist · {roomDeals.length}
          </h3>
        </div>
        {roomDeals.length === 0 ? (
          <EmptyState
            title="No deals added yet."
            body="Add deals from the Deals feed — votes and Group Fit Score will show up here."
            cta={<Link to="/" className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background">Browse deals</Link>}
          />
        ) : (
          <div className="space-y-3">
            {roomDeals.map((d) => {
              const fit = scoreDealForRoom(room, d, roomVotes);
              const dealVotes = roomVotes.filter((v) => v.dealId === d.id);
              return (
                <div key={d.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link to="/deals/$dealId" params={{ dealId: d.id }} className="min-w-0 flex-1 hover:underline">
                      <div className="truncate text-sm font-semibold">{d.title}</div>
                      <div className="text-xs text-muted-foreground">${d.pricePerPerson}/pp · deal score {d.dealScore}</div>
                    </Link>
                    <FitBadge fit={fit} />
                  </div>
                  {fit.conflicts.length > 0 && <ConflictRow conflicts={fit.conflicts} />}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Link to="/deals/$dealId" params={{ dealId: d.id }} className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted">
                      View Details
                    </Link>
                    <ViewDealButton
                      deal={d}
                      clickedFrom="trip_room"
                      tripRoomId={room.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background"
                    >
                      Check Availability <ExternalLink className="h-3 w-3" />
                    </ViewDealButton>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {VOTE_OPTIONS.map((vo) => {
                      const count = dealVotes.filter((v) => v.voteType === vo.type).length;
                      const mine = dealVotes.find((v) => v.userId === (getCurrentUserId() ?? "me"))?.voteType === vo.type;
                      return (
                        <button key={vo.type}
                          onClick={() => storeActions.recordVote({
                            id: crypto.randomUUID(), tripRoomId: room.id, dealId: d.id,
                            userId: getCurrentUserId() ?? "me", userName: "You",
                            voteType: vo.type, createdAt: new Date().toISOString(),
                          })}
                          className={
                            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] " +
                            (mine ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-muted")
                          }>
                          {vo.icon} {vo.label} {count > 0 && <span className={`rounded-full px-1.5 ${mine ? "bg-background text-foreground" : "bg-foreground text-background"}`}>{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function GroupSummaryPanel({
  topDestName, topDealTitle, biggest, budgetWarning, nextAction,
}: {
  topDestName: string | null; topDealTitle: string | null;
  biggest: string | null; budgetWarning: string | null; nextAction: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        <Sparkles className="h-3.5 w-3.5" /> Group decision summary
      </div>
      <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
        <li><span className="text-muted-foreground">Top destination:</span> <span className="font-medium">{topDestName ?? "—"}</span></li>
        <li><span className="text-muted-foreground">Top deal:</span> <span className="font-medium">{topDealTitle ?? "—"}</span></li>
        <li><span className="text-muted-foreground">Biggest disagreement:</span> <span className="font-medium">{biggest ?? "—"}</span></li>
        <li><span className="text-muted-foreground">Budget watch:</span> <span className="font-medium">{budgetWarning ?? "OK"}</span></li>
      </ul>
      <div className="mt-2 rounded-md bg-background/70 px-2 py-1.5 text-[11px]"><span className="text-muted-foreground">Best next action: </span>{nextAction}</div>
    </div>
  );
}

function DestinationShortlistCard({
  dest, roomId, fit, hotDealCount, votes,
}: {
  dest: typeof mockDestinations[number];
  roomId: string;
  fit: GroupFitResult;
  hotDealCount: number;
  votes: NonNullable<TripRoom["destinationVotes"]>;
}) {
  const monthName = (m: number) => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1];
  const myId = getCurrentUserId() ?? "me";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="relative h-28">
        <img src={dest.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase opacity-80">{dest.country}</div>
              <div className="font-display text-base leading-tight">{dest.name}</div>
            </div>
            <FitBadge fit={fit} compact />
          </div>
        </div>
        {hotDealCount > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-foreground">
            {hotDealCount} deal{hotDealCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex flex-wrap gap-1">
          {dest.vibeTags.slice(0, 4).map((t) => (
            <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{t}</span>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Best: {dest.bestMonths.slice(0, 4).map(monthName).join(", ")}
          {dest.rainyMonths.length > 0 && (
            <> · <span className="text-[var(--warning)]">rainy {dest.rainyMonths.slice(0, 3).map(monthName).join(", ")}</span></>
          )}
        </div>
        {fit.conflicts.length > 0 && <ConflictRow conflicts={fit.conflicts} />}
        <p className="text-[11px] text-muted-foreground italic">{fit.explanation}</p>

        <div className="flex flex-wrap gap-1">
          {VOTE_OPTIONS.map((vo) => {
            const count = votes.filter((v) => v.voteType === vo.type).length;
            const mine = votes.find((v) => v.userId === myId)?.voteType === vo.type;
            return (
              <button key={vo.type}
                onClick={() => storeActions.recordDestinationVote({
                  id: crypto.randomUUID(), tripRoomId: roomId, destinationId: dest.id,
                  userId: myId, userName: "You",
                  voteType: vo.type, createdAt: new Date().toISOString(),
                })}
                className={
                  "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] " +
                  (mine ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-muted")
                }>
                {vo.icon} {vo.label}{count > 0 && <span className={`rounded-full px-1 ${mine ? "bg-background text-foreground" : "bg-foreground text-background"}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        {votes.length === 0 && (
          <div className="rounded bg-muted/60 px-2 py-1 text-[10px] text-muted-foreground">
            Waiting on the group. Once more friends vote, Azulva can rank the strongest fit.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Link to="/explore/$slug" params={{ slug: dest.slug }}
            className="rounded-lg bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">View</Link>
          <a href={`/watchlist?destination=${dest.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] hover:bg-muted">
            <Bell className="h-3 w-3" /> Deal Watch
          </a>
          <button
            onClick={() => storeActions.removeDestinationFromTripRoom(roomId, dest.id)}
            className="ml-auto rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
            aria-label="Remove from room">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FitBadge({ fit, compact = false }: { fit: GroupFitResult; compact?: boolean }) {
  const color = fitColor(fit.score);
  return (
    <div
      className={"flex items-center gap-2 rounded-lg bg-background/95 px-2 py-1 text-foreground " + (compact ? "text-[10px]" : "text-xs")}
      title={fit.explanation}
    >
      <div className="font-display text-base leading-none" style={{ color }}>{fit.score}</div>
      <div className="leading-tight">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Group fit</div>
        <div className="font-semibold" style={{ color }}>{fit.label}</div>
      </div>
    </div>
  );
}

function ConflictRow({ conflicts }: { conflicts: GroupFitResult["conflicts"] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {conflicts.map((c) => (
        <span key={c} className="inline-flex items-center gap-1 rounded-full bg-[var(--warning)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--warning)]">
          <AlertTriangle className="h-2.5 w-2.5" /> {conflictLabel(c)}
        </span>
      ))}
    </div>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background p-4 text-center">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{body}</div>
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  );
}

function MyPrefsEditor({ room }: { room: TripRoom }) {
  const myId = getCurrentUserId();
  const me = (room.members ?? []).find((m) => m.userId === myId);
  const existing: TripRoomMemberPreferences = me?.preferences ?? {};
  const [prefs, setPrefs] = useState<TripRoomMemberPreferences>(existing);
  const [open, setOpen] = useState(true);

  if (!myId) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-xs">
        <div className="font-semibold">Personalize the group score.</div>
        <p className="mt-1 text-muted-foreground">Sign in to add your budget, travel style, and preferred months so Azulva can rank the best options for the group.</p>
      </div>
    );
  }

  function save() {
    storeActions.updateMemberPreferences(room.id, prefs);
    setOpen(false);
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-xs">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between font-semibold">
        Your preferences for this trip <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Your budget/pp</span>
            <input type="number" value={prefs.preferredBudgetPerPerson ?? ""}
              onChange={(e) => setPrefs({ ...prefs, preferredBudgetPerPerson: e.target.value ? +e.target.value : undefined })}
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Max flight stops</span>
            <input type="number" min={0} max={3} value={prefs.maxFlightStops ?? ""}
              onChange={(e) => setPrefs({ ...prefs, maxFlightStops: e.target.value ? +e.target.value : undefined })}
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Adults-only?</span>
            <select value={prefs.adultsOnlyPreference ?? "either"}
              onChange={(e) => setPrefs({ ...prefs, adultsOnlyPreference: e.target.value as "yes" | "no" | "either" })}
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm">
              <option value="either">Either</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Family-friendly?</span>
            <select value={prefs.familyFriendlyPreference ?? "either"}
              onChange={(e) => setPrefs({ ...prefs, familyFriendlyPreference: e.target.value as "yes" | "no" | "either" })}
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm">
              <option value="either">Either</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Preferred months (comma-separated 1–12)</span>
            <input type="text" value={(prefs.preferredMonths ?? []).join(",")}
              onChange={(e) => setPrefs({ ...prefs, preferredMonths: e.target.value.split(",").map((x) => +x.trim()).filter((n) => n >= 1 && n <= 12) })}
              placeholder="3,4"
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Travel style tags (comma-separated)</span>
            <input type="text" value={(prefs.travelStyleTags ?? []).join(",")}
              onChange={(e) => setPrefs({ ...prefs, travelStyleTags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
              placeholder="Relaxing, Party, Family"
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
          </label>
          <div className="sm:col-span-2">
            <button onClick={save} className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background">Save preferences</button>
          </div>
        </div>
      )}
    </div>
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
          memberNames: ["You"], dealIds: [],
          destinationIds: [], destinationVotes: [],
          createdAt: new Date().toISOString(),
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
