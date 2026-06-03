
-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  home_airport TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name',
             NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name',
             split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ USER PREFERENCES ============
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences"
  ON public.user_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SAVED DEALS ============
CREATE TABLE public.saved_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, deal_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_deals TO authenticated;
GRANT ALL ON public.saved_deals TO service_role;
ALTER TABLE public.saved_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved deals"
  ON public.saved_deals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SAVED DESTINATIONS ============
CREATE TABLE public.saved_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, destination_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_destinations TO authenticated;
GRANT ALL ON public.saved_destinations TO service_role;
ALTER TABLE public.saved_destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved destinations"
  ON public.saved_destinations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ WATCHLISTS ============
CREATE TABLE public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlists TO authenticated;
GRANT ALL ON public.watchlists TO service_role;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watchlists"
  ON public.watchlists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER watchlists_set_updated_at
  BEFORE UPDATE ON public.watchlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TRIP ROOMS ============
CREATE TABLE public.trip_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_rooms TO authenticated;
GRANT ALL ON public.trip_rooms TO service_role;
ALTER TABLE public.trip_rooms ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trip_rooms_set_updated_at
  BEFORE UPDATE ON public.trip_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.trip_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_room_members TO authenticated;
GRANT ALL ON public.trip_room_members TO service_role;
ALTER TABLE public.trip_room_members ENABLE ROW LEVEL SECURITY;

-- security definer: is current user a member?
CREATE OR REPLACE FUNCTION public.is_trip_member(_room UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trip_room_members WHERE room_id = _room AND user_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.is_trip_owner(_room UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trip_rooms WHERE id = _room AND owner_id = _user)
$$;

-- trip_rooms policies (after helpers exist)
CREATE POLICY "Members can view trip rooms"
  ON public.trip_rooms FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_trip_member(id, auth.uid()));
CREATE POLICY "Authenticated users create trip rooms they own"
  ON public.trip_rooms FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update trip rooms"
  ON public.trip_rooms FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners delete trip rooms"
  ON public.trip_rooms FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- trip_room_members policies
CREATE POLICY "Members view membership"
  ON public.trip_room_members FOR SELECT TO authenticated
  USING (public.is_trip_member(room_id, auth.uid()) OR public.is_trip_owner(room_id, auth.uid()));
CREATE POLICY "Users join rooms as themselves"
  ON public.trip_room_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own membership"
  ON public.trip_room_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users leave; owners remove"
  ON public.trip_room_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_trip_owner(room_id, auth.uid()));

-- ============ TRIP ROOM DEALS ============
CREATE TABLE public.trip_room_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.trip_rooms(id) ON DELETE CASCADE,
  deal_id TEXT NOT NULL,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, deal_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_room_deals TO authenticated;
GRANT ALL ON public.trip_room_deals TO service_role;
ALTER TABLE public.trip_room_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read trip room deals"
  ON public.trip_room_deals FOR SELECT TO authenticated
  USING (public.is_trip_member(room_id, auth.uid()) OR public.is_trip_owner(room_id, auth.uid()));
CREATE POLICY "Members add trip room deals"
  ON public.trip_room_deals FOR INSERT TO authenticated
  WITH CHECK (added_by = auth.uid() AND (public.is_trip_member(room_id, auth.uid()) OR public.is_trip_owner(room_id, auth.uid())));
CREATE POLICY "Adder or owner removes trip room deals"
  ON public.trip_room_deals FOR DELETE TO authenticated
  USING (added_by = auth.uid() OR public.is_trip_owner(room_id, auth.uid()));

-- ============ TRIP ROOM VOTES ============
CREATE TABLE public.trip_room_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.trip_rooms(id) ON DELETE CASCADE,
  deal_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, deal_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_room_votes TO authenticated;
GRANT ALL ON public.trip_room_votes TO service_role;
ALTER TABLE public.trip_room_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read votes"
  ON public.trip_room_votes FOR SELECT TO authenticated
  USING (public.is_trip_member(room_id, auth.uid()) OR public.is_trip_owner(room_id, auth.uid()));
CREATE POLICY "Members cast own votes"
  ON public.trip_room_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.is_trip_member(room_id, auth.uid()) OR public.is_trip_owner(room_id, auth.uid())));
CREATE POLICY "Users update own votes"
  ON public.trip_room_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own votes"
  ON public.trip_room_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ OUTBOUND CLICKS ============
CREATE TABLE public.outbound_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deal_id TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.outbound_clicks TO authenticated;
GRANT INSERT ON public.outbound_clicks TO anon;
GRANT ALL ON public.outbound_clicks TO service_role;
ALTER TABLE public.outbound_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a click"
  ON public.outbound_clicks FOR INSERT TO authenticated, anon
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Users read own clicks"
  ON public.outbound_clicks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============ CUSTOM DEALS (admin) ============
CREATE TABLE public.custom_deals (
  id TEXT PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_deals TO authenticated;
GRANT SELECT ON public.custom_deals TO anon;
GRANT ALL ON public.custom_deals TO service_role;
ALTER TABLE public.custom_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Custom deals are world-readable"
  ON public.custom_deals FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Authenticated users create custom deals"
  ON public.custom_deals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators update custom deals"
  ON public.custom_deals FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators delete custom deals"
  ON public.custom_deals FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE TRIGGER custom_deals_set_updated_at
  BEFORE UPDATE ON public.custom_deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
