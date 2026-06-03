// Cloud sync layer for Azulva — maps app state <-> Supabase.
// All functions are best-effort; callers log errors but UI keeps working
// from in-memory state.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Deal, DealVote, OutboundClick, TripRoom, Watchlist } from "./types";

type CloudState = {
  savedDealIds: string[];
  savedDestinationIds: string[];
  watchlists: Watchlist[];
  tripRooms: TripRoom[];
  votes: DealVote[];
  customDeals: Deal[];
};

export async function loadCloudState(userId: string): Promise<CloudState> {
  const [savedDeals, savedDests, watchlists, ownedRooms, memberRooms, customDeals] = await Promise.all([
    supabase.from("saved_deals").select("deal_id").eq("user_id", userId),
    supabase.from("saved_destinations").select("destination_id").eq("user_id", userId),
    supabase.from("watchlists").select("id, data, created_at").eq("user_id", userId),
    supabase.from("trip_rooms").select("id, name, invite_code, owner_id, data, created_at"),
    supabase.from("trip_room_members").select("room_id, display_name, user_id"),
    supabase.from("custom_deals").select("id, data"),
  ]);

  const rooms = (ownedRooms.data ?? []);
  const roomIds = rooms.map((r) => r.id);

  let dealsByRoom: Record<string, string[]> = {};
  let votes: DealVote[] = [];
  let members = memberRooms.data ?? [];
  if (roomIds.length > 0) {
    const [trd, trv] = await Promise.all([
      supabase.from("trip_room_deals").select("room_id, deal_id").in("room_id", roomIds),
      supabase.from("trip_room_votes").select("id, room_id, deal_id, user_id, vote_type, comment, created_at").in("room_id", roomIds),
    ]);
    (trd.data ?? []).forEach((row) => {
      dealsByRoom[row.room_id] = dealsByRoom[row.room_id] ?? [];
      dealsByRoom[row.room_id].push(row.deal_id);
    });
    votes = (trv.data ?? []).map((v) => ({
      id: v.id,
      tripRoomId: v.room_id,
      dealId: v.deal_id,
      userId: v.user_id,
      userName: "Member",
      voteType: v.vote_type as DealVote["voteType"],
      comment: v.comment ?? undefined,
      createdAt: v.created_at,
    }));
  }

  // Resolve member display names via profiles
  const memberUserIds = Array.from(new Set(members.map((m) => m.user_id)));
  let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (memberUserIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles").select("id, display_name, avatar_url").in("id", memberUserIds);
    (profs ?? []).forEach((p) => {
      profileMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
    });
  }
  // Attach userName to votes
  votes = votes.map((v) => ({
    ...v,
    userName: profileMap[v.userId]?.display_name ?? "Member",
  }));

  const tripRooms: TripRoom[] = rooms.map((r) => {
    const data = (r.data as Record<string, unknown> | null) ?? {};
    const roomMembers = members.filter((m) => m.room_id === r.id);
    const memberNames = roomMembers.map(
      (m) => m.display_name ?? profileMap[m.user_id]?.display_name ?? "Member"
    );
    return {
      id: r.id,
      ownerId: r.owner_id,
      name: r.name,
      description: (data.description as string) ?? undefined,
      desiredDateStart: (data.desiredDateStart as string) ?? undefined,
      desiredDateEnd: (data.desiredDateEnd as string) ?? undefined,
      budgetPerPerson: (data.budgetPerPerson as number) ?? 1500,
      groupSize: (data.groupSize as number) ?? memberNames.length ?? 4,
      homeAirports: (data.homeAirports as string[]) ?? [],
      preferredDestinations: (data.preferredDestinations as string[]) ?? [],
      tripType: (data.tripType as TripRoom["tripType"]) ?? "friends",
      inviteCode: r.invite_code,
      memberNames,
      dealIds: dealsByRoom[r.id] ?? [],
      createdAt: r.created_at,
    };
  });

  return {
    savedDealIds: (savedDeals.data ?? []).map((r) => r.deal_id),
    savedDestinationIds: (savedDests.data ?? []).map((r) => r.destination_id),
    watchlists: (watchlists.data ?? []).map((w) => {
      const d = (w.data as unknown as Watchlist) ?? ({} as Watchlist);
      return { ...d, id: w.id, userId: userId, createdAt: w.created_at };
    }),
    tripRooms,
    votes,
    customDeals: (customDeals.data ?? []).map((c) => ({ ...(c.data as unknown as Deal), id: c.id })),
  };
}

// ============ migration ============

async function isMigrated(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_preferences").select("data").eq("user_id", userId).maybeSingle();
  const flags = (data?.data as Record<string, unknown> | undefined) ?? {};
  return Boolean(flags["migrated_v1"]);
}

async function markMigrated(userId: string) {
  const { data } = await supabase
    .from("user_preferences").select("data").eq("user_id", userId).maybeSingle();
  const existing = (data?.data as Record<string, unknown> | undefined) ?? {};
  await supabase.from("user_preferences").upsert(
    { user_id: userId, data: { ...existing, migrated_v1: true } },
    { onConflict: "user_id" },
  );
}

export async function migrateLocalToCloud(
  userId: string,
  local: {
    savedDealIds: string[];
    watchlists: Watchlist[];
    tripRooms: TripRoom[];
    votes: DealVote[];
    customDeals: Deal[];
  },
): Promise<boolean> {
  if (await isMigrated(userId)) return false;

  try {
    // Saved deals — idempotent via unique (user_id, deal_id)
    if (local.savedDealIds.length > 0) {
      await supabase.from("saved_deals").upsert(
        local.savedDealIds.map((deal_id) => ({ user_id: userId, deal_id })),
        { onConflict: "user_id,deal_id", ignoreDuplicates: true },
      );
    }

    // Watchlists — only migrate if user has none in cloud
    const { count: wlCount } = await supabase
      .from("watchlists").select("*", { count: "exact", head: true }).eq("user_id", userId);
    if ((wlCount ?? 0) === 0 && local.watchlists.length > 0) {
      await supabase.from("watchlists").insert(
        local.watchlists.map((w) => ({ user_id: userId, data: w as unknown as Json })),
      );
    }

    // Trip rooms — only if cloud has none owned by user
    const { count: trCount } = await supabase
      .from("trip_rooms").select("*", { count: "exact", head: true }).eq("owner_id", userId);
    if ((trCount ?? 0) === 0 && local.tripRooms.length > 0) {
      for (const t of local.tripRooms) {
        const code = t.inviteCode || Math.random().toString(36).slice(2, 8).toUpperCase();
        const { data: inserted, error } = await supabase
          .from("trip_rooms").insert({
            owner_id: userId,
            name: t.name,
            invite_code: code,
            data: {
              description: t.description,
              budgetPerPerson: t.budgetPerPerson,
              groupSize: t.groupSize,
              homeAirports: t.homeAirports,
              preferredDestinations: t.preferredDestinations,
              tripType: t.tripType,
              desiredDateStart: t.desiredDateStart,
              desiredDateEnd: t.desiredDateEnd,
            },
          }).select("id").single();
        if (error || !inserted) continue;
        await supabase.from("trip_room_members").upsert(
          { room_id: inserted.id, user_id: userId, role: "owner" },
          { onConflict: "room_id,user_id", ignoreDuplicates: true },
        );
        if (t.dealIds.length > 0) {
          await supabase.from("trip_room_deals").upsert(
            t.dealIds.map((deal_id) => ({ room_id: inserted.id, deal_id, added_by: userId })),
            { onConflict: "room_id,deal_id", ignoreDuplicates: true },
          );
        }
      }
    }

    await markMigrated(userId);
    return true;
  } catch (e) {
    console.error("[cloudSync] migration failed", e);
    return false;
  }
}

// ============ write helpers ============

export async function cloudToggleSavedDeal(userId: string, dealId: string, nowSaved: boolean) {
  if (nowSaved) {
    await supabase.from("saved_deals").upsert(
      { user_id: userId, deal_id: dealId },
      { onConflict: "user_id,deal_id", ignoreDuplicates: true },
    );
  } else {
    await supabase.from("saved_deals").delete().eq("user_id", userId).eq("deal_id", dealId);
  }
}

export async function cloudToggleSavedDestination(userId: string, destId: string, nowSaved: boolean) {
  if (nowSaved) {
    await supabase.from("saved_destinations").upsert(
      { user_id: userId, destination_id: destId },
      { onConflict: "user_id,destination_id", ignoreDuplicates: true },
    );
  } else {
    await supabase.from("saved_destinations").delete().eq("user_id", userId).eq("destination_id", destId);
  }
}

export async function cloudAddWatchlist(userId: string, w: Watchlist) {
  const { data, error } = await supabase
    .from("watchlists").insert({ user_id: userId, data: w as unknown as Json }).select("id").single();
  if (error || !data) return w.id;
  return data.id;
}

export async function cloudDeleteWatchlist(id: string) {
  await supabase.from("watchlists").delete().eq("id", id);
}

export async function cloudCreateTripRoom(userId: string, t: TripRoom): Promise<string | null> {
  const { data, error } = await supabase.from("trip_rooms").insert({
    owner_id: userId,
    name: t.name,
    invite_code: t.inviteCode,
    data: {
      description: t.description,
      budgetPerPerson: t.budgetPerPerson,
      groupSize: t.groupSize,
      homeAirports: t.homeAirports,
      preferredDestinations: t.preferredDestinations,
      tripType: t.tripType,
    },
  }).select("id").single();
  if (error || !data) { console.error("[cloud] createTripRoom", error); return null; }
  await supabase.from("trip_room_members").upsert(
    { room_id: data.id, user_id: userId, role: "owner" },
    { onConflict: "room_id,user_id", ignoreDuplicates: true },
  );
  return data.id;
}

export async function cloudAddDealToTripRoom(roomId: string, dealId: string, userId: string) {
  await supabase.from("trip_room_deals").upsert(
    { room_id: roomId, deal_id: dealId, added_by: userId },
    { onConflict: "room_id,deal_id", ignoreDuplicates: true },
  );
}

export async function cloudRecordVote(v: DealVote) {
  // Delete-then-insert avoids relying on a more specific composite upsert
  await supabase.from("trip_room_votes")
    .delete().eq("room_id", v.tripRoomId).eq("deal_id", v.dealId).eq("user_id", v.userId);
  await supabase.from("trip_room_votes").insert({
    room_id: v.tripRoomId, deal_id: v.dealId, user_id: v.userId,
    vote_type: v.voteType, comment: v.comment ?? null,
  });
}

export async function cloudRecordOutboundClick(c: OutboundClick, userId: string | null) {
  await supabase.from("outbound_clicks").insert({
    deal_id: c.dealId, user_id: userId, source: c.outboundUrl,
  });
}

export async function cloudAddCustomDeal(userId: string, d: Deal) {
  await supabase.from("custom_deals").upsert(
    { id: d.id, data: d as unknown as Json, created_by: userId },
    { onConflict: "id" },
  );
}

export async function cloudDeleteCustomDeal(id: string) {
  await supabase.from("custom_deals").delete().eq("id", id);
}

export async function cloudJoinByCode(code: string, displayName?: string | null) {
  const { data, error } = await supabase.rpc("join_trip_room_by_code", {
    _code: code, _display_name: displayName ?? undefined,
  });
  if (error) throw error;
  return data as string;
}
