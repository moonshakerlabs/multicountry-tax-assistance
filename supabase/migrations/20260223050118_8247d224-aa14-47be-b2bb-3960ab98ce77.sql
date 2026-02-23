
-- Table for admin-managed privacy policy content (versioned)
CREATE TABLE public.privacy_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

ALTER TABLE public.privacy_policy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active privacy policy"
ON public.privacy_policy_versions FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all versions"
ON public.privacy_policy_versions FOR SELECT
USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

CREATE POLICY "Admins can manage privacy policy"
ON public.privacy_policy_versions FOR ALL
USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

-- Table for FAQ items
CREATE TABLE public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published FAQs"
ON public.faq_items FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can view all FAQs"
ON public.faq_items FOR SELECT
USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

CREATE POLICY "Admins can manage FAQs"
ON public.faq_items FOR ALL
USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

-- Add privacy_policy and faq modules to role_permissions for existing roles
INSERT INTO public.role_permissions (role, module, can_read, can_write) VALUES
  ('super_admin', 'privacy_policy', true, true),
  ('employee_admin', 'privacy_policy', true, false),
  ('user_admin', 'privacy_policy', true, false),
  ('super_admin', 'faq', true, true),
  ('employee_admin', 'faq', true, true),
  ('user_admin', 'faq', true, false)
ON CONFLICT DO NOTHING;

-- Trigger to auto-update updated_at on faq_items
CREATE TRIGGER update_faq_items_updated_at
BEFORE UPDATE ON public.faq_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
