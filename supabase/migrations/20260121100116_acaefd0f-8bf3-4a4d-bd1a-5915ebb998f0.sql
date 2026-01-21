-- Create user_roles table (RBAC source of truth)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" 
ON public.user_roles 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- Create user_profile table for tax residency and preferences
CREATE TABLE IF NOT EXISTS public.user_profile (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    primary_tax_residency TEXT NOT NULL DEFAULT 'GERMANY' CHECK (primary_tax_residency IN ('GERMANY', 'INDIA')),
    other_tax_countries TEXT[] DEFAULT '{}',
    preferred_language TEXT NOT NULL DEFAULT 'EN' CHECK (preferred_language IN ('EN', 'DE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_profile
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- Policies for user_profile
CREATE POLICY "Users can view their own profile" 
ON public.user_profile 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profile 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profile 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.user_profile 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- Create categories table (system-defined categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country TEXT NOT NULL,
    main_category TEXT NOT NULL,
    sub_category TEXT NOT NULL,
    label_en TEXT NOT NULL,
    label_de TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (country, main_category, sub_category)
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policies for categories (read-only for authenticated users)
CREATE POLICY "Authenticated users can view categories" 
ON public.categories 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage categories" 
ON public.categories 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- Create custom_categories table (user-defined categories)
CREATE TABLE IF NOT EXISTS public.custom_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    country TEXT NOT NULL,
    main_category TEXT NOT NULL,
    sub_category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, country, main_category, sub_category)
);

-- Enable RLS on custom_categories
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

-- Policies for custom_categories
CREATE POLICY "Users can view their own custom categories" 
ON public.custom_categories 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom categories" 
ON public.custom_categories 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own custom categories" 
ON public.custom_categories 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom categories" 
ON public.custom_categories 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all custom categories" 
ON public.custom_categories 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- Add missing columns to documents table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'country') THEN
        ALTER TABLE public.documents ADD COLUMN country TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'tax_year') THEN
        ALTER TABLE public.documents ADD COLUMN tax_year TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'main_category') THEN
        ALTER TABLE public.documents ADD COLUMN main_category TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'sub_category') THEN
        ALTER TABLE public.documents ADD COLUMN sub_category TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'custom_sub_category') THEN
        ALTER TABLE public.documents ADD COLUMN custom_sub_category TEXT;
    END IF;
END $$;

-- Create storage bucket for user documents (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-documents', 'user-documents', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for user-documents bucket
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'user-documents' AND auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'user-documents' AND auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'user-documents' AND auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'user-documents' AND auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update has_role function to use user_roles table instead of profiles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles (if any)
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_roles.user_id = profiles.id AND user_roles.role = profiles.role
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Create trigger to add default user role on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Seed default categories for Germany
INSERT INTO public.categories (country, main_category, sub_category, label_en, label_de) VALUES
-- Germany Income
('GERMANY', 'Income', 'Salary', 'Salary Statements', 'Gehaltsabrechnungen'),
('GERMANY', 'Income', 'Bonus', 'Bonus Statements', 'Bonusabrechnungen'),
('GERMANY', 'Income', 'Freelance', 'Freelance Income', 'Freiberufliche Einkünfte'),
('GERMANY', 'Income', 'Rental', 'Rental Income', 'Mieteinnahmen'),
('GERMANY', 'Income', 'Investment', 'Investment Income', 'Kapitalerträge'),
-- Germany Deductions
('GERMANY', 'Deductions', 'Work_Related', 'Work-related Expenses', 'Werbungskosten'),
('GERMANY', 'Deductions', 'Insurance', 'Insurance Premiums', 'Versicherungsbeiträge'),
('GERMANY', 'Deductions', 'Donations', 'Charitable Donations', 'Spenden'),
('GERMANY', 'Deductions', 'Education', 'Education Expenses', 'Bildungskosten'),
('GERMANY', 'Deductions', 'Medical', 'Medical Expenses', 'Krankheitskosten'),
-- Germany Tax Documents
('GERMANY', 'Tax_Documents', 'Tax_Return', 'Tax Return Copy', 'Steuererklärung'),
('GERMANY', 'Tax_Documents', 'Tax_Assessment', 'Tax Assessment Notice', 'Steuerbescheid'),
('GERMANY', 'Tax_Documents', 'Tax_ID', 'Tax ID Documents', 'Steuer-ID Dokumente'),
-- India Income
('INDIA', 'Income', 'Salary', 'Salary Statements', NULL),
('INDIA', 'Income', 'Business', 'Business Income', NULL),
('INDIA', 'Income', 'Rental', 'Rental Income', NULL),
('INDIA', 'Income', 'Capital_Gains', 'Capital Gains', NULL),
('INDIA', 'Income', 'Interest', 'Interest Income', NULL),
-- India Deductions
('INDIA', 'Deductions', '80C', 'Section 80C Investments', NULL),
('INDIA', 'Deductions', '80D', 'Health Insurance (80D)', NULL),
('INDIA', 'Deductions', 'HRA', 'House Rent Allowance', NULL),
('INDIA', 'Deductions', 'LTA', 'Leave Travel Allowance', NULL),
-- India Tax Documents
('INDIA', 'Tax_Documents', 'Form_16', 'Form 16', NULL),
('INDIA', 'Tax_Documents', 'ITR', 'Income Tax Return', NULL),
('INDIA', 'Tax_Documents', 'PAN', 'PAN Card', NULL),
('INDIA', 'Tax_Documents', 'TDS', 'TDS Certificates', NULL)
ON CONFLICT (country, main_category, sub_category) DO NOTHING;