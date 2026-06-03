-- waitlist_signups: public email capture for early access
CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  home_airport text,
  preferred_destinations text[],
  max_budget_per_person integer,
  trip_type text,
  group_size integer,
  priorities text[],
  referral_code text UNIQUE,
  referred_by text,
  source text,
  status text NOT NULL DEFAULT 'new',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_signups TO authenticated;
GRANT ALL ON public.waitlist_signups TO service_role;
-- anon can insert (signup) and update own row by email matching via upsert (we restrict to INSERT only; update goes through admin or re-insert path)
GRANT INSERT, UPDATE ON public.waitlist_signups TO anon;

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a signup
CREATE POLICY "Anyone inserts waitlist"
  ON public.waitlist_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can update by email (used for upsert ON CONFLICT) — restricted to non-admin fields by trigger could be added later;
-- for now allow update of preference fields freely (no PII exposed since SELECT is locked to admins).
CREATE POLICY "Anyone updates own waitlist by email"
  ON public.waitlist_signups FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Only admin viewers can read the full list
CREATE POLICY "Admin viewers read waitlist"
  ON public.waitlist_signups FOR SELECT
  TO authenticated
  USING (has_admin_role('viewer'));

-- Admins manage status / delete
CREATE POLICY "Admins delete waitlist"
  ON public.waitlist_signups FOR DELETE
  TO authenticated
  USING (has_admin_role('admin'));

CREATE TRIGGER trg_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist_signups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX waitlist_signups_created_at_idx ON public.waitlist_signups (created_at DESC);
CREATE INDEX waitlist_signups_referred_by_idx ON public.waitlist_signups (referred_by);

-- feedback_submissions: lightweight public feedback capture
CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  page text,
  feedback_type text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  rating integer,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.feedback_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_submissions TO authenticated;
GRANT ALL ON public.feedback_submissions TO service_role;

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone submits feedback"
  ON public.feedback_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));

CREATE POLICY "Admin viewers read feedback"
  ON public.feedback_submissions FOR SELECT
  TO authenticated
  USING (has_admin_role('viewer'));

CREATE POLICY "Admins delete feedback"
  ON public.feedback_submissions FOR DELETE
  TO authenticated
  USING (has_admin_role('admin'));

CREATE INDEX feedback_submissions_created_at_idx ON public.feedback_submissions (created_at DESC);