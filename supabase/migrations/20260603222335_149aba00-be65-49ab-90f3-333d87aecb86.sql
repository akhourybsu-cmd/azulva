DROP POLICY IF EXISTS "Anyone updates own waitlist by email" ON public.waitlist_signups;
REVOKE UPDATE ON public.waitlist_signups FROM anon, authenticated;

-- SECURITY DEFINER upsert: limits writable columns, never touches status/admin_note.
CREATE OR REPLACE FUNCTION public.submit_waitlist(
  _email text,
  _name text DEFAULT NULL,
  _home_airport text DEFAULT NULL,
  _preferred_destinations text[] DEFAULT NULL,
  _max_budget_per_person integer DEFAULT NULL,
  _trip_type text DEFAULT NULL,
  _group_size integer DEFAULT NULL,
  _priorities text[] DEFAULT NULL,
  _referred_by text DEFAULT NULL,
  _source text DEFAULT NULL
) RETURNS TABLE (id uuid, referral_code text, was_existing boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean_email text := lower(trim(_email));
  _existing_id uuid;
  _existing_code text;
  _new_code text;
BEGIN
  IF _clean_email IS NULL OR _clean_email = '' OR position('@' in _clean_email) = 0 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  SELECT s.id, s.referral_code INTO _existing_id, _existing_code
  FROM public.waitlist_signups s WHERE s.email = _clean_email;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.waitlist_signups SET
      name = COALESCE(_name, name),
      home_airport = COALESCE(_home_airport, home_airport),
      preferred_destinations = COALESCE(_preferred_destinations, preferred_destinations),
      max_budget_per_person = COALESCE(_max_budget_per_person, max_budget_per_person),
      trip_type = COALESCE(_trip_type, trip_type),
      group_size = COALESCE(_group_size, group_size),
      priorities = COALESCE(_priorities, priorities)
    WHERE id = _existing_id;
    RETURN QUERY SELECT _existing_id, _existing_code, true;
    RETURN;
  END IF;

  -- New signup: generate referral code (8 chars, retry on rare collision).
  LOOP
    _new_code := upper(substr(encode(gen_random_bytes(6), 'base64'), 1, 8));
    _new_code := regexp_replace(_new_code, '[^A-Z0-9]', '', 'g');
    IF length(_new_code) >= 6
       AND NOT EXISTS (SELECT 1 FROM public.waitlist_signups WHERE referral_code = _new_code) THEN
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.waitlist_signups (
    email, name, home_airport, preferred_destinations, max_budget_per_person,
    trip_type, group_size, priorities, referral_code, referred_by, source
  ) VALUES (
    _clean_email, _name, _home_airport, _preferred_destinations, _max_budget_per_person,
    _trip_type, _group_size, _priorities, _new_code, NULLIF(trim(_referred_by), ''), _source
  ) RETURNING waitlist_signups.id INTO _existing_id;

  RETURN QUERY SELECT _existing_id, _new_code, false;
END
$$;

REVOKE EXECUTE ON FUNCTION public.submit_waitlist(text, text, text, text[], integer, text, integer, text[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_waitlist(text, text, text, text[], integer, text, integer, text[], text, text) TO anon, authenticated;