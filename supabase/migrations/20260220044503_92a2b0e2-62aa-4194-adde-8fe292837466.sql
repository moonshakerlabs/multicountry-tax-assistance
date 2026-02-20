
-- =====================================================
-- Subscription Configuration Table (admin-managed)
-- =====================================================
CREATE TABLE public.subscription_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage config
CREATE POLICY "Admins can manage subscription config"
  ON public.subscription_config FOR ALL
  USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

CREATE POLICY "Admins can view subscription config"
  ON public.subscription_config FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

-- Authenticated users can read config (needed for homepage early access display)
CREATE POLICY "Authenticated users can view config"
  ON public.subscription_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Public can read specific config keys (for homepage early access banner)
CREATE POLICY "Public can view early access config"
  ON public.subscription_config FOR SELECT
  USING (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_subscription_config_updated_at
  BEFORE UPDATE ON public.subscription_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Seed initial config values
-- =====================================================
INSERT INTO public.subscription_config (config_key, config_value, description) VALUES
  ('default_trial_days', '30', 'Default free trial period in days for new users (Pro features)'),
  ('default_trial_plan', 'PRO', 'Plan level granted during default trial (PRO or FREEMIUM)'),
  ('early_access_enabled', 'true', 'Whether early access offer is currently active'),
  ('early_access_deadline', '2026-04-30', 'Users who sign up before this date get early access offers (YYYY-MM-DD)'),
  ('early_access_freemium_days', '180', 'Days of free Freemium features for early access users'),
  ('early_access_pro_days', '90', 'Days of free Pro features for early access users'),
  ('early_access_headline', '🚀 Early Access Offer', 'Headline shown on homepage for early access'),
  ('early_access_description', 'Sign up now and get 6 months of Freemium + 3 months of Pro features completely free!', 'Description for early access offer');

-- =====================================================
-- Add trial tracking columns to user_subscriptions
-- =====================================================
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_plan TEXT,
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS early_access_user BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS early_access_freemium_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS early_access_pro_end TIMESTAMP WITH TIME ZONE;
