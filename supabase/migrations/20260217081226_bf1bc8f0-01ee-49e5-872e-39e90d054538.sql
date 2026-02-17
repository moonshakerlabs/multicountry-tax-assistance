
-- 1. Create triggers that were missing (functions already exist)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 2. Create role_permissions table for per-role checkbox-based permissions
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module text NOT NULL,
  can_read boolean NOT NULL DEFAULT false,
  can_write boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all permissions
CREATE POLICY "Super admins can manage permissions"
  ON public.role_permissions FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_super_admin(auth.uid()));

-- Any admin can view permissions
CREATE POLICY "Admins can view permissions"
  ON public.role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_any_admin(auth.uid()));

-- Authenticated users can view their own role's permissions
CREATE POLICY "Users can view own role permissions"
  ON public.role_permissions FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    role IN (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Seed default permissions for each role
INSERT INTO public.role_permissions (role, module, can_read, can_write) VALUES
  -- Admin defaults
  ('admin', 'employees', true, false),
  ('admin', 'customers', true, true),
  ('admin', 'subscriptions', true, false),
  ('admin', 'payments', true, false),
  ('admin', 'posts', true, true),
  ('admin', 'moderation', true, true),
  ('admin', 'activity_logs', true, false),
  -- Employee admin defaults
  ('employee_admin', 'employees', false, false),
  ('employee_admin', 'customers', true, false),
  ('employee_admin', 'subscriptions', true, false),
  ('employee_admin', 'payments', true, false),
  ('employee_admin', 'posts', true, true),
  ('employee_admin', 'moderation', true, true),
  ('employee_admin', 'activity_logs', false, false);
