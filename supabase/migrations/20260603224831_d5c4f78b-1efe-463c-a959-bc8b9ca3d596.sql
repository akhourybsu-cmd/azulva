
CREATE TABLE public.pilot_qa_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key text NOT NULL UNIQUE,
  area text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'not_checked',
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilot_qa_checks TO authenticated;
GRANT ALL ON public.pilot_qa_checks TO service_role;

ALTER TABLE public.pilot_qa_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin viewers read pilot qa"
  ON public.pilot_qa_checks FOR SELECT TO authenticated
  USING (public.has_admin_role('viewer'));

CREATE POLICY "Editors insert pilot qa"
  ON public.pilot_qa_checks FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_role('editor') AND (updated_by IS NULL OR updated_by = auth.uid()));

CREATE POLICY "Editors update pilot qa"
  ON public.pilot_qa_checks FOR UPDATE TO authenticated
  USING (public.has_admin_role('editor'))
  WITH CHECK (public.has_admin_role('editor'));

CREATE POLICY "Admins delete pilot qa"
  ON public.pilot_qa_checks FOR DELETE TO authenticated
  USING (public.has_admin_role('admin'));

CREATE TRIGGER pilot_qa_checks_updated_at
  BEFORE UPDATE ON public.pilot_qa_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
