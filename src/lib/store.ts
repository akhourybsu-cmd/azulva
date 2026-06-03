// Client-side store for app state: saved deals, watchlists, trip rooms.
// MVP uses localStorage. Replace with Supabase tables later.
import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import type { Watchlist, TripRoom, DealVote, OutboundClick, Deal } from "./types";
import { mockDeals } from "./data/mockDeals";

const isBrowser = typeof window !== "undefined";

type StoreShape = {
  savedDealIds: string[];
  watchlists: Watchlist[];
  tripRooms: TripRoom[];
  votes: DealVote[];
  outboundClicks: OutboundClick[];
  customDeals: Deal[]; // admin-created
};

const DEFAULT: StoreShape = {
  savedDealIds: [],
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
      createdAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
    },
  ],
  tripRooms: [
    {
      id: "tr-1", ownerId: "me", name: "Sam's Bachelorette 🌴",
      description: "5 girls, somewhere fun, late March.",
      desiredDateStart: undefined, desiredDateEnd: undefined,
      budgetPerPerson: 1500, groupSize: 5,
      homeAirports: ["BOS", "JFK"], preferredDestinations: ["dst-punta-cana", "dst-cancun"],
      tripType: "bachelorette", inviteCode: "BACH-PC-25",
      memberNames: ["You", "Sam", "Jess", "Mia", "Riley"],
      dealIds: ["d-2", "d-4", "d-25"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "tr-2", ownerId: "me", name: "Family Spring Break",
      description: "2 adults, 2 kids — easy flight.",
      budgetPerPerson: 1300, groupSize: 4,
      homeAirports: ["BOS"], preferredDestinations: ["dst-cancun", "dst-bahamas"],
      tripType: "family", inviteCode: "FAM-SB-25",
      memberNames: ["You", "Partner"],
      dealIds: ["d-3", "d-15", "d-18"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "tr-3", ownerId: "me", name: "Couples 4-pack",
      description: "Two couples, adults-only, mid-budget.",
      budgetPerPerson: 1700, groupSize: 4,
      homeAirports: ["EWR"], preferredDestinations: ["dst-riviera-maya", "dst-aruba"],
      tripType: "couples", inviteCode: "CPL-4P-25",
      memberNames: ["You", "Alex", "Jordan", "Taylor"],
      dealIds: ["d-5", "d-9"],
      createdAt: new Date().toISOString(),
    },
  ],
  votes: [
    { id: "v-1", tripRoomId: "tr-1", dealId: "d-2", userId: "u-sam", userName: "Sam", voteType: "love", comment: "Adults-only swim-up, yes please", createdAt: new Date().toISOString() },
    { id: "v-2", tripRoomId: "tr-1", dealId: "d-2", userId: "u-jess", userName: "Jess", voteType: "interested", createdAt: new Date().toISOString() },
    { id: "v-3", tripRoomId: "tr-1", dealId: "d-4", userId: "u-sam", userName: "Sam", voteType: "love", createdAt: new Date().toISOString() },
    { id: "v-4", tripRoomId: "tr-1", dealId: "d-25", userId: "u-mia", userName: "Mia", voteType: "too_expensive", createdAt: new Date().toISOString() },
  ],
  outboundClicks: [],
  customDeals: [],
};

const KEY = "ais-store-v1";

function load(): StoreShape {
  if (!isBrowser) return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { return DEFAULT; }
}

let state: StoreShape = load();
const listeners = new Set<() => void>();

function persist() {
  if (isBrowser) localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() { return state; }

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const storeActions = {
  toggleSaved(dealId: string) {
    state = {
      ...state,
      savedDealIds: state.savedDealIds.includes(dealId)
        ? state.savedDealIds.filter((id) => id !== dealId)
        : [...state.savedDealIds, dealId],
    };
    persist();
  },
  addWatchlist(w: Watchlist) {
    state = { ...state, watchlists: [w, ...state.watchlists] };
    persist();
  },
  deleteWatchlist(id: string) {
    state = { ...state, watchlists: state.watchlists.filter((w) => w.id !== id) };
    persist();
  },
  addTripRoom(t: TripRoom) {
    state = { ...state, tripRooms: [t, ...state.tripRooms] };
    persist();
  },
  addDealToTripRoom(tripRoomId: string, dealId: string) {
    state = {
      ...state,
      tripRooms: state.tripRooms.map((t) =>
        t.id === tripRoomId && !t.dealIds.includes(dealId)
          ? { ...t, dealIds: [...t.dealIds, dealId] } : t),
    };
    persist();
  },
  recordVote(v: DealVote) {
    state = {
      ...state,
      votes: [v, ...state.votes.filter((x) => !(x.tripRoomId === v.tripRoomId && x.dealId === v.dealId && x.userId === v.userId))],
    };
    persist();
  },
  recordOutboundClick(c: OutboundClick) {
    state = { ...state, outboundClicks: [c, ...state.outboundClicks] };
    persist();
  },
  addCustomDeal(d: Deal) {
    state = { ...state, customDeals: [d, ...state.customDeals] };
    persist();
  },
  deleteCustomDeal(id: string) {
    state = { ...state, customDeals: state.customDeals.filter((d) => d.id !== id) };
    persist();
  },
};

export function allDeals(): Deal[] {
  return [...state.customDeals, ...mockDeals];
}

export function useAllDeals() {
  const s = useStore();
  return [...s.customDeals, ...mockDeals];
}
