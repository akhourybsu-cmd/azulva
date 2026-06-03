
-- import_batches
CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  filename text,
  mode text NOT NULL DEFAULT 'draft',
  total_rows integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'previewed',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin viewers read import batches" ON public.import_batches
  FOR SELECT TO authenticated USING (has_admin_role('viewer'));
CREATE POLICY "Editors create import batches" ON public.import_batches
  FOR INSERT TO authenticated
  WITH CHECK (has_admin_role('editor') AND (uploaded_by IS NULL OR uploaded_by = auth.uid()));
CREATE POLICY "Editors update import batches" ON public.import_batches
  FOR UPDATE TO authenticated USING (has_admin_role('editor')) WITH CHECK (has_admin_role('editor'));

-- import_batch_rows
CREATE TABLE public.import_batch_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  status text NOT NULL,
  message text,
  raw_data jsonb,
  created_deal_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.import_batch_rows TO authenticated;
GRANT ALL ON public.import_batch_rows TO service_role;
ALTER TABLE public.import_batch_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin viewers read import rows" ON public.import_batch_rows
  FOR SELECT TO authenticated USING (has_admin_role('viewer'));
CREATE POLICY "Editors insert import rows" ON public.import_batch_rows
  FOR INSERT TO authenticated WITH CHECK (has_admin_role('editor'));

-- app_settings
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "App settings world-readable" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert app settings" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (has_admin_role('admin') AND (updated_by IS NULL OR updated_by = auth.uid()));
CREATE POLICY "Admins update app settings" ON public.app_settings
  FOR UPDATE TO authenticated USING (has_admin_role('admin')) WITH CHECK (has_admin_role('admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('app_mode', '"demo"'::jsonb),
  ('show_sample_deals', 'true'::jsonb),
  ('allow_public_custom_deals', 'true'::jsonb),
  ('affiliate_disclosure_enabled', 'true'::jsonb),
  ('verification_notice_enabled', 'true'::jsonb);

-- admin_audit_log
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT DELETE ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin viewers read audit" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (has_admin_role('viewer'));
CREATE POLICY "Editors write audit" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (has_admin_role('editor') AND (actor_user_id IS NULL OR actor_user_id = auth.uid()));
CREATE POLICY "Admins delete audit" ON public.admin_audit_log
  FOR DELETE TO authenticated USING (has_admin_role('admin'));

CREATE INDEX idx_audit_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_batches_created ON public.import_batches(created_at DESC);
CREATE INDEX idx_batch_rows_batch ON public.import_batch_rows(batch_id);
