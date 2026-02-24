
-- =============================================
-- 1. Plan Features table (feature flags per plan)
-- =============================================
CREATE TABLE public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feature_key)
);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view features" ON public.plan_features
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage features" ON public.plan_features
  FOR ALL USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

-- =============================================
-- 2. Plan Feature Mapping table
-- =============================================
CREATE TABLE public.plan_feature_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL,
  feature_key text NOT NULL REFERENCES public.plan_features(feature_key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_key, feature_key)
);

ALTER TABLE public.plan_feature_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view plan feature mapping" ON public.plan_feature_mapping
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage plan feature mapping" ON public.plan_feature_mapping
  FOR ALL USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

-- =============================================
-- 3. Plan Pricing table (admin-managed prices)
-- =============================================
CREATE TABLE public.plan_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'MONTHLY',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_key, billing_cycle)
);

ALTER TABLE public.plan_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view plan pricing" ON public.plan_pricing
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage plan pricing" ON public.plan_pricing
  FOR ALL USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

-- =============================================
-- 4. Add scheduled_downgrade fields to user_subscriptions
-- =============================================
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS scheduled_plan text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS scheduled_billing_cycle text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS downgrade_scheduled_at timestamptz DEFAULT NULL;

-- =============================================
-- 5. Seed default features
-- =============================================
INSERT INTO public.plan_features (feature_key, feature_name, description) VALUES
  ('AI_TOOLS_ACCESS', 'AI Tools Access', 'Access to AI-powered document analysis and tax tools'),
  ('MOBILE_SCANNER', 'Mobile Scanner', 'Upload documents via mobile scanner to vault'),
  ('EXPORT_REPORTS', 'Export Reports', 'Export AI-generated reports as PDF/CSV'),
  ('PRIORITY_SUPPORT', 'Priority Support', 'Priority customer support queue'),
  ('SECURE_VAULT', 'Secure Vault', 'Access to encrypted secure document vault'),
  ('GOOGLE_DRIVE', 'Google Drive', 'Store documents in personal Google Drive'),
  ('DOCUMENT_SHARING', 'Document Sharing', 'Share documents securely with CAs')
ON CONFLICT (feature_key) DO NOTHING;

-- =============================================
-- 6. Seed default plan feature mappings
-- =============================================
-- FREE plan
INSERT INTO public.plan_feature_mapping (plan_key, feature_key, enabled) VALUES
  ('FREE', 'AI_TOOLS_ACCESS', false),
  ('FREE', 'MOBILE_SCANNER', false),
  ('FREE', 'EXPORT_REPORTS', false),
  ('FREE', 'PRIORITY_SUPPORT', false),
  ('FREE', 'SECURE_VAULT', false),
  ('FREE', 'GOOGLE_DRIVE', true),
  ('FREE', 'DOCUMENT_SHARING', true)
ON CONFLICT (plan_key, feature_key) DO NOTHING;

-- FREEMIUM plan
INSERT INTO public.plan_feature_mapping (plan_key, feature_key, enabled) VALUES
  ('FREEMIUM', 'AI_TOOLS_ACCESS', false),
  ('FREEMIUM', 'MOBILE_SCANNER', true),
  ('FREEMIUM', 'EXPORT_REPORTS', false),
  ('FREEMIUM', 'PRIORITY_SUPPORT', false),
  ('FREEMIUM', 'SECURE_VAULT', true),
  ('FREEMIUM', 'GOOGLE_DRIVE', true),
  ('FREEMIUM', 'DOCUMENT_SHARING', true)
ON CONFLICT (plan_key, feature_key) DO NOTHING;

-- PRO plan
INSERT INTO public.plan_feature_mapping (plan_key, feature_key, enabled) VALUES
  ('PRO', 'AI_TOOLS_ACCESS', true),
  ('PRO', 'MOBILE_SCANNER', true),
  ('PRO', 'EXPORT_REPORTS', true),
  ('PRO', 'PRIORITY_SUPPORT', false),
  ('PRO', 'SECURE_VAULT', true),
  ('PRO', 'GOOGLE_DRIVE', true),
  ('PRO', 'DOCUMENT_SHARING', true)
ON CONFLICT (plan_key, feature_key) DO NOTHING;

-- SUPER_PRO plan
INSERT INTO public.plan_feature_mapping (plan_key, feature_key, enabled) VALUES
  ('SUPER_PRO', 'AI_TOOLS_ACCESS', true),
  ('SUPER_PRO', 'MOBILE_SCANNER', true),
  ('SUPER_PRO', 'EXPORT_REPORTS', true),
  ('SUPER_PRO', 'PRIORITY_SUPPORT', true),
  ('SUPER_PRO', 'SECURE_VAULT', true),
  ('SUPER_PRO', 'GOOGLE_DRIVE', true),
  ('SUPER_PRO', 'DOCUMENT_SHARING', true)
ON CONFLICT (plan_key, feature_key) DO NOTHING;

-- =============================================
-- 7. Seed default plan pricing
-- =============================================
INSERT INTO public.plan_pricing (plan_key, billing_cycle, price) VALUES
  ('FREE', 'MONTHLY', 0),
  ('FREE', 'YEARLY', 0),
  ('FREEMIUM', 'MONTHLY', 5),
  ('FREEMIUM', 'YEARLY', 50),
  ('PRO', 'MONTHLY', 10),
  ('PRO', 'YEARLY', 100),
  ('SUPER_PRO', 'MONTHLY', 0),
  ('SUPER_PRO', 'YEARLY', 0)
ON CONFLICT (plan_key, billing_cycle) DO NOTHING;

-- =============================================
-- 8. Update triggers
-- =============================================
CREATE TRIGGER update_plan_features_updated_at
  BEFORE UPDATE ON public.plan_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_pricing_updated_at
  BEFORE UPDATE ON public.plan_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
