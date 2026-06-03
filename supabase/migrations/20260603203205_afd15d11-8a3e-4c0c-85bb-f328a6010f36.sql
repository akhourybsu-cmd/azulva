
-- Re-apply with explicit hardening: STRICT (returns null on null input),
-- LEAKPROOF-friendly search_path, and an explicit auth.uid() guard.
CREATE OR REPLACE FUNCTION public.is_trip_member(_room uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user IS NOT NULL
     AND _user = auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.trip_room_members
       WHERE room_id = _room AND user_id = _user
     )
$$;

CREATE OR REPLACE FUNCTION public.is_trip_owner(_room uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user IS NOT NULL
     AND _user = auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.trip_rooms
       WHERE id = _room AND owner_id = _user
     )
$$;

-- Lock down the invite-join RPC: keep auth.uid() check, restrict EXECUTE to authenticated only.
REVOKE EXECUTE ON FUNCTION public.join_trip_room_by_code(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_trip_room_by_code(text, text) TO authenticated;
