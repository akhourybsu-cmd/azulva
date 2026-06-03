
-- trip_room_destinations
CREATE TABLE public.trip_room_destinations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL,
  destination_id text NOT NULL,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, destination_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_room_destinations TO authenticated;
GRANT ALL ON public.trip_room_destinations TO service_role;
ALTER TABLE public.trip_room_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read trip room destinations"
  ON public.trip_room_destinations FOR SELECT TO authenticated
  USING (is_trip_member(room_id, auth.uid()) OR is_trip_owner(room_id, auth.uid()));

CREATE POLICY "Members add trip room destinations"
  ON public.trip_room_destinations FOR INSERT TO authenticated
  WITH CHECK (added_by = auth.uid() AND (is_trip_member(room_id, auth.uid()) OR is_trip_owner(room_id, auth.uid())));

CREATE POLICY "Adder or owner removes trip room destinations"
  ON public.trip_room_destinations FOR DELETE TO authenticated
  USING (added_by = auth.uid() OR is_trip_owner(room_id, auth.uid()));

-- trip_room_destination_votes
CREATE TABLE public.trip_room_destination_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL,
  destination_id text NOT NULL,
  user_id uuid NOT NULL,
  vote_type text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, destination_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_room_destination_votes TO authenticated;
GRANT ALL ON public.trip_room_destination_votes TO service_role;
ALTER TABLE public.trip_room_destination_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read destination votes"
  ON public.trip_room_destination_votes FOR SELECT TO authenticated
  USING (is_trip_member(room_id, auth.uid()) OR is_trip_owner(room_id, auth.uid()));

CREATE POLICY "Members cast own destination votes"
  ON public.trip_room_destination_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (is_trip_member(room_id, auth.uid()) OR is_trip_owner(room_id, auth.uid())));

CREATE POLICY "Users update own destination votes"
  ON public.trip_room_destination_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own destination votes"
  ON public.trip_room_destination_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_trip_room_destination_votes_updated_at
  BEFORE UPDATE ON public.trip_room_destination_votes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Per-member preferences as JSON on trip_room_members
ALTER TABLE public.trip_room_members
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
