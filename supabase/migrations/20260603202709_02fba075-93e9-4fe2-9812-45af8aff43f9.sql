
-- Unique constraints for idempotent inserts/upserts
ALTER TABLE public.saved_deals ADD CONSTRAINT saved_deals_user_deal_unique UNIQUE (user_id, deal_id);
ALTER TABLE public.saved_destinations ADD CONSTRAINT saved_destinations_user_dest_unique UNIQUE (user_id, destination_id);
ALTER TABLE public.trip_room_members ADD CONSTRAINT trip_room_members_room_user_unique UNIQUE (room_id, user_id);
ALTER TABLE public.trip_room_deals ADD CONSTRAINT trip_room_deals_room_deal_unique UNIQUE (room_id, deal_id);
ALTER TABLE public.trip_room_votes ADD CONSTRAINT trip_room_votes_room_deal_user_unique UNIQUE (room_id, deal_id, user_id);
ALTER TABLE public.trip_rooms ADD CONSTRAINT trip_rooms_invite_code_unique UNIQUE (invite_code);

-- Security definer fn so non-members can look up & join a room by invite code
CREATE OR REPLACE FUNCTION public.join_trip_room_by_code(_code text, _display_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _room_id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT id INTO _room_id FROM public.trip_rooms WHERE invite_code = _code;
  IF _room_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  INSERT INTO public.trip_room_members (room_id, user_id, display_name, role)
  VALUES (_room_id, _uid, _display_name, 'member')
  ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN _room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_trip_room_by_code(text, text) TO authenticated;
