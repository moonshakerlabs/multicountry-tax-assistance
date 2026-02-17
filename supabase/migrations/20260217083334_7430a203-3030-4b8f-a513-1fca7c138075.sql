
-- 1. Migrate existing role data: employee_admin → user_admin, then admin → employee_admin
UPDATE public.user_roles SET role = 'user_admin' WHERE role = 'employee_admin';
UPDATE public.user_roles SET role = 'employee_admin' WHERE role = 'admin';
UPDATE public.profiles SET role = 'user_admin' WHERE role = 'employee_admin';
UPDATE public.profiles SET role = 'employee_admin' WHERE role = 'admin';
UPDATE public.role_permissions SET role = 'user_admin' WHERE role = 'employee_admin';
UPDATE public.role_permissions SET role = 'employee_admin' WHERE role = 'admin';

-- 2. Update is_any_admin function
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('super_admin'::app_role, 'employee_admin'::app_role, 'user_admin'::app_role)
  )
$$;

-- 3. Update ALL RLS policies to use is_any_admin()
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all answers" ON public.community_answers;
CREATE POLICY "Admins can manage all answers" ON public.community_answers FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can view all answers" ON public.community_answers;
CREATE POLICY "Admins can view all answers" ON public.community_answers FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all posts" ON public.community_posts;
CREATE POLICY "Admins can manage all posts" ON public.community_posts FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can view all posts" ON public.community_posts;
CREATE POLICY "Admins can view all posts" ON public.community_posts FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all reports" ON public.community_reports;
CREATE POLICY "Admins can manage all reports" ON public.community_reports FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all custom categories" ON public.custom_categories;
CREATE POLICY "Admins can view all custom categories" ON public.custom_categories FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all subscription history" ON public.subscription_history;
CREATE POLICY "Admins can view all subscription history" ON public.subscription_history FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all country preferences" ON public.user_country_preferences;
CREATE POLICY "Admins can view all country preferences" ON public.user_country_preferences FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profile;
CREATE POLICY "Admins can view all profiles" ON public.user_profile FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.user_subscriptions FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

-- role_permissions: allow any admin to manage
DROP POLICY IF EXISTS "Super admins can manage permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage permissions" ON public.role_permissions FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

-- 4. Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" ON public.activity_logs FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert logs" ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE INDEX idx_activity_logs_user ON public.activity_logs (user_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs (created_at DESC);
