
-- Create employee_profiles table to store HR data for admin/employee users
CREATE TABLE public.employee_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  employee_id text NOT NULL UNIQUE,
  phone_number text NOT NULL,
  role text NOT NULL DEFAULT 'user_admin',
  joined_date date NOT NULL,
  resigned_date date,
  employment_status text NOT NULL DEFAULT 'ACTIVE',
  address text,
  pan_number text,
  uan_number text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all employee profiles"
ON public.employee_profiles FOR ALL
USING (auth.uid() IS NOT NULL AND is_super_admin(auth.uid()));

CREATE POLICY "Employee admins can view employee profiles"
ON public.employee_profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

CREATE POLICY "Employees can view their own profile"
ON public.employee_profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE TRIGGER update_employee_profiles_updated_at
BEFORE UPDATE ON public.employee_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
