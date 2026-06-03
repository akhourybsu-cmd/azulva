// Client-side store for Azulva.
// Signed-out users: localStorage only.
// Signed-in users: hydrated from Supabase; writes go to cloud + local cache.
import { useSyncExternalStore } from "react";
import type { Watchlist, TripRoom, DealVote, OutboundClick, Deal } from "./types";
import { mockDeals } from "./data/mockDeals";
import * as cloud from "./cloudSync";

const isBrowser = typeof window !== "undefined";

type StoreShape = {
  savedDealIds: string[];
  savedDestinationIds: string[];
  watchlists: Watchlist[];
  tripRooms: TripRoom[];
  votes: DealVote[];
  outboundClicks: OutboundClick[];
  customDeals: Deal[];
};

const SEED: StoreShape = {
  savedDealIds: [],
  savedDestinationIds: [],
  watchlists: [
    {
      id: "w-1", userId: "me", name: "Cheap Punta Cana from BOS",
      homeAirport: "BOS", backupAirports: ["PVD", "JFK"],
      destinations: ["dst-punta-cana"], flexibleDates: true,
      minNights: 4, maxNights: 7, maxPricePerPerson: 1400,
      adultsOnlyRequired: false, familyFriendlyRequired: false,
      minimumResortRating: 4, nonstopPreferred: true,
      flightIncludedRequired: true, transfersPreferred: true,
      minimumDealScore: 75, alertFrequency: "daily", enabled: true,
      createdAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "w-2", userId: "me", name: "Adults-only Caribbean under $1800",
      homeAirport: "JFK", backupAirports: ["EWR", "LGA"],
      destinations: "Anywhere", flexibleDates: true,
      minNights: 5, maxNights: 7, maxPricePerPerson: 1800,
      adultsOnlyRequired: true, familyFriendlyRequired: false,
      minimumResortRating: 4, nonstopPreferred: false,
      flightIncludedRequired: true, transfersPreferred: true,
      minimumDealScore: 80, alertFrequency: "weekly", enabled: true,
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  tripRooms: [
    {
      id: "tr-1", ownerId: "me", name: "Sam's Bachelorette 🌴",
      description: "5 girls, somewhere fun, late March.",
      budgetPerPerson: 1500, groupSize: 5,
      homeAirports: ["BOS", "JFK"], preferredDestinations: ["dst-punta-cana", "dst-cancun"],
      tripType: "bachelorette", inviteCode: "BACH-PC-25",
      memberNames: ["You", "Sam", "Jess", "Mia", "Riley"],
      dealIds: ["d-2", "d-4", "d-25"],
      createdAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "tr-2", ownerId: "me", name: "Family Spring Break",
      description: "2 adults, 2 kids — easy flight.",
      budgetPerPerson: 1300, groupSize: 4,
      homeAirports: ["BOS"], preferredDestinations: ["dst-cancun", "dst-bahamas"],
      tripType: "family", inviteCode: "FAM-SB-25",
      memberNames: ["You", "Partner"],
      dealIds: ["d-3", "d-15", "d-18"],
      createdAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "tr-3", ownerId: "me", name: "Couples 4-pack",
      description: "Two couples, adults-only, mid-budget.",
      budgetPerPerson: 1700, groupSize: 4,
      homeAirports: ["EWR"], preferredDestinations: ["dst-riviera-maya", "dst-aruba"],
      tripType: "couples", inviteCode: "CPL-4P-25",
      memberNames: ["You", "Alex", "Jordan", "Taylor"],
      dealIds: ["d-5", "d-9"],
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  votes: [
    { id: "v-1", tripRoomId: "tr-1", dealId: "d-2", userId: "u-sam", userName: "Sam", voteType: "love", comment: "Adults-only swim-up, yes please", createdAt: "2026-06-01T00:00:00.000Z" },
    { id: "v-2", tripRoomId: "tr-1", dealId: "d-2", userId: "u-jess", userName: "Jess", voteType: "interested", createdAt: "2026-06-01T00:00:00.000Z" },
    { id: "v-3", tripRoomId: "tr-1", dealId: "d-4", userId: "u-sam", userName: "Sam", voteType: "love", createdAt: "2026-06-01T00:00:00.000Z" },
    { id: "v-4", tripRoomId: "tr-1", dealId: "d-25", userId: "u-mia", userName: "Mia", voteType: "too_expensive", createdAt: "2026-06-01T00:00:00.000Z" },
  ],
  outboundClicks: [],
  customDeals: [],
};

const EMPTY: StoreShape = {
  savedDealIds: [], savedDestinationIds: [], watchlists: [], tripRooms: [],
  votes: [], outboundClicks: [], customDeals: [],
};

const ANON_KEY = "ais-store-v1";
function userKey(uid: string) { return `ais-store:${uid}`; }

let currentUserId: string | null = null;
let state: StoreShape = loadInitial();

function loadInitial(): StoreShape {
  if (!isBrowser) return SEED;
  try {
    const raw = localStorage.getItem(ANON_KEY);
    if (!raw) return SEED;
    return { ...SEED, ...JSON.parse(raw) };
  } catch { return SEED; }
}

function loadFromStorage(key: string, fallback: StoreShape): StoreShape {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch { return fallback; }
}

const listeners = new Set<() => void>();
function persist() {
  if (isBrowser) {
    const key = currentUserId ? userKey(currentUserId) : ANON_KEY;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
function getSnapshot() { return state; }

export function useStore() { return useSyncExternalStore(subscribe, getSnapshot, getSnapshot); }

export function getCurrentUserId() { return currentUserId; }

// Called by AppShell on auth state change.
export async function setCurrentUser(userId: string | null) {
  if (userId === currentUserId) return;
  if (userId === null) {
    currentUserId = null;
    state = loadFromStorage(ANON_KEY, SEED);
    persist();
    return;
  }
  // Switching to a user. Capture any anonymous data first.
  const anon = loadFromStorage(ANON_KEY, EMPTY);
  currentUserId = userId;
  // Hydrate from user-scoped cache for snappy first paint
  state = loadFromStorage(userKey(userId), EMPTY);
  persist();

  try {
    // Best-effort migration of anon data on first login (idempotent server-side)
    await cloud.migrateLocalToCloud(userId, {
      savedDealIds: anon.savedDealIds,
      watchlists: anon.watchlists,
      tripRooms: anon.tripRooms,
      votes: anon.votes,
      customDeals: anon.customDeals,
    });
    // Pull authoritative cloud state
    const cs = await cloud.loadCloudState(userId);
    state = {
      ...state,
      savedDealIds: cs.savedDealIds,
      savedDestinationIds: cs.savedDestinationIds,
      watchlists: cs.watchlists,
      tripRooms: cs.tripRooms,
      votes: cs.votes,
      customDeals: cs.customDeals,
    };
    persist();
  } catch (e) {
    console.error("[store] cloud hydrate failed", e);
  }
}

function logCloud(label: string, p: Promise<unknown>) {
  p.catch((e) => console.error(`[cloud:${label}]`, e));
}

export const storeActions = {
  toggleSaved(dealId: string) {
    const has = state.savedDealIds.includes(dealId);
    state = {
      ...state,
      savedDealIds: has
        ? state.savedDealIds.filter((id) => id !== dealId)
        : [...state.savedDealIds, dealId],
    };
    persist();
    if (currentUserId) logCloud("toggleSaved", cloud.cloudToggleSavedDeal(currentUserId, dealId, !has));
  },
  toggleSavedDestination(destId: string) {
    const has = state.savedDestinationIds.includes(destId);
    state = {
      ...state,
      savedDestinationIds: has
        ? state.savedDestinationIds.filter((id) => id !== destId)
        : [...state.savedDestinationIds, destId],
    };
    persist();
    if (currentUserId) logCloud("toggleSavedDest", cloud.cloudToggleSavedDestination(currentUserId, destId, !has));
  },
  addWatchlist(w: Watchlist) {
    state = { ...state, watchlists: [w, ...state.watchlists] };
    persist();
    if (currentUserId) {
      const uid = currentUserId;
      cloud.cloudAddWatchlist(uid, w).then((cloudId) => {
        if (cloudId && cloudId !== w.id) {
          state = {
            ...state,
            watchlists: state.watchlists.map((x) => x.id === w.id ? { ...x, id: cloudId } : x),
          };
          persist();
        }
      }).catch((e) => console.error("[cloud:addWatchlist]", e));
    }
  },
  deleteWatchlist(id: string) {
    state = { ...state, watchlists: state.watchlists.filter((w) => w.id !== id) };
    persist();
    if (currentUserId) logCloud("delWatchlist", cloud.cloudDeleteWatchlist(id));
  },
  addTripRoom(t: TripRoom) {
    state = { ...state, tripRooms: [t, ...state.tripRooms] };
    persist();
    if (currentUserId) {
      const uid = currentUserId;
      cloud.cloudCreateTripRoom(uid, t).then((cloudId) => {
        if (cloudId && cloudId !== t.id) {
          state = {
            ...state,
            tripRooms: state.tripRooms.map((x) => x.id === t.id ? { ...x, id: cloudId, ownerId: uid } : x),
          };
          persist();
        }
      }).catch((e) => console.error("[cloud:addTripRoom]", e));
    }
  },
  addDealToTripRoom(tripRoomId: string, dealId: string) {
    state = {
      ...state,
      tripRooms: state.tripRooms.map((t) =>
        t.id === tripRoomId && !t.dealIds.includes(dealId)
          ? { ...t, dealIds: [...t.dealIds, dealId] } : t),
    };
    persist();
    if (currentUserId) {
      const uid = currentUserId;
      cloud.cloudAddDealToTripRoom(tripRoomId, dealId, uid)
        .then(() => storeActions.rehydrateTripRooms())
        .catch((e) => console.error("[cloud:addDealToRoom]", e));
    }
  },
  recordVote(v: DealVote) {
    const myV = { ...v, userId: currentUserId ?? v.userId };
    state = {
      ...state,
      votes: [myV, ...state.votes.filter((x) =>
        !(x.tripRoomId === myV.tripRoomId && x.dealId === myV.dealId && x.userId === myV.userId))],
    };
    persist();
    if (currentUserId) {
      cloud.cloudRecordVote(myV)
        .then(() => storeActions.rehydrateTripRooms())
        .catch((e) => console.error("[cloud:recordVote]", e));
    }
  },
  recordOutboundClick(c: OutboundClick) {
    state = { ...state, outboundClicks: [c, ...state.outboundClicks] };
    persist();
    logCloud("outbound", cloud.cloudRecordOutboundClick(c, currentUserId));
  },
  addCustomDeal(d: Deal) {
    state = { ...state, customDeals: [d, ...state.customDeals] };
    persist();
    if (currentUserId) logCloud("addCustomDeal", cloud.cloudAddCustomDeal(currentUserId, d));
  },
  deleteCustomDeal(id: string) {
    state = { ...state, customDeals: state.customDeals.filter((d) => d.id !== id) };
    persist();
    if (currentUserId) logCloud("delCustomDeal", cloud.cloudDeleteCustomDeal(id));
  },
  async joinTripRoomByCode(code: string, displayName?: string | null): Promise<{ ok: boolean; error?: string }> {
    if (!currentUserId) return { ok: false, error: "Sign in to join a Trip Room." };
    try {
      await cloud.cloudJoinByCode(code.trim().toUpperCase(), displayName ?? null);
      await storeActions.rehydrateTripRooms();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message ?? "Could not join room" };
    }
  },
  async rehydrateTripRooms() {
    if (!currentUserId) return;
    try {
      const cs = await cloud.loadCloudState(currentUserId);
      state = { ...state, tripRooms: cs.tripRooms, votes: cs.votes };
      persist();
    } catch (e) { console.error("[store:rehydrate]", e); }
  },
  async createDemoTripRoom() {
    const demo: TripRoom = {
      id: crypto.randomUUID(), ownerId: currentUserId ?? "me",
      name: "Sample: Long weekend in Cancún",
      description: "A demo room you can edit, vote in, or delete.",
      budgetPerPerson: 1400, groupSize: 4,
      homeAirports: ["BOS"], preferredDestinations: ["dst-cancun"],
      tripType: "friends",
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      memberNames: ["You"], dealIds: ["d-3", "d-15"],
      createdAt: new Date().toISOString(),
    };
    this.addTripRoom(demo);
  },
};


export function allDeals(): Deal[] {
  return [...state.customDeals, ...mockDeals];
}

export function useAllDeals() {
  const s = useStore();
  return [...s.customDeals, ...mockDeals];
}
