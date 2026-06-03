import { useState } from "react";
import { useStore, storeActions } from "@/lib/store";
import { Users, Plus, X } from "lucide-react";

export function SuggestToTripRoomButton({
  destinationId,
  className,
  label = "Suggest in Trip Room",
}: {
  destinationId: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={
          "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted " +
          (className ?? "")
        }
      >
        <Users className="h-4 w-4" /> {label}
      </button>
      {open && <SuggestToTripRoomDialog destinationId={destinationId} onClose={() => setOpen(false)} />}
    </>
  );
}

function SuggestToTripRoomDialog({
  destinationId,
  onClose,
}: {
  destinationId: string;
  onClose: () => void;
}) {
  const s = useStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  function suggest(roomId: string) {
    storeActions.addDestinationToTripRoom(roomId, destinationId);
    onClose();
  }

  function createAndSuggest(e: React.FormEvent) {
    e.preventDefault();
    const id = crypto.randomUUID();
    storeActions.addTripRoom({
      id,
      ownerId: "me",
      name: name || "New trip",
      budgetPerPerson: 1500,
      groupSize: 4,
      homeAirports: ["BOS"],
      preferredDestinations: [destinationId],
      tripType: "friends",
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      memberNames: ["You"],
      dealIds: [],
      destinationIds: [destinationId],
      destinationVotes: [],
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl">Add to a Trip Room</h2>
            <p className="text-xs text-muted-foreground">Suggest this destination so the group can vote on it.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!creating && s.tripRooms.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-auto">
            {s.tripRooms.map((t) => {
              const already = t.destinationIds.includes(destinationId);
              return (
                <button
                  key={t.id}
                  disabled={already}
                  onClick={() => suggest(t.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left hover:bg-muted disabled:opacity-60"
                >
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.memberNames.length} member{t.memberNames.length === 1 ? "" : "s"} · ${t.budgetPerPerson}/pp
                    </div>
                  </div>
                  {already ? (
                    <span className="text-xs text-muted-foreground">Already added</span>
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="mt-3 w-full rounded-lg border border-dashed border-border px-3 py-2 text-sm hover:bg-muted"
          >
            + Create a new Trip Room with this destination
          </button>
        )}

        {creating && (
          <form onSubmit={createAndSuggest} className="space-y-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Trip name (e.g. Spring 2026)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button className="w-full rounded-lg bg-foreground py-2 text-sm font-semibold text-background">
              Create room & add destination
            </button>
            <button type="button" onClick={() => setCreating(false)} className="w-full text-xs text-muted-foreground underline">
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
