
-- Create archived_users table for soft-deleted accounts
CREATE TABLE IF NOT EXISTS public.archived_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id uuid NOT NULL,
  email text NOT NULL,
  meaningful_user_id text,
  first_name text,
  last_name text,
  deletion_requested_at timestamp with time zone NOT NULL DEFAULT now(),
  deletion_complete_at timestamp with time zone,
  storage_preference text,
  google_drive_connected boolean DEFAULT false,
  reason text DEFAULT 'user_requested',
  status text NOT NULL DEFAULT 'PENDING_DELETION',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.archived_users ENABLE ROW LEVEL SECURITY;

-- Only super admins can view archived users
CREATE POLICY "Super admins can view archived users"
ON public.archived_users
FOR SELECT
USING (auth.uid() IS NOT NULL AND public.is_super_admin(auth.uid()));

-- Super admins can manage archived users
CREATE POLICY "Super admins can manage archived users"
ON public.archived_users
FOR ALL
USING (auth.uid() IS NOT NULL AND public.is_super_admin(auth.uid()));

-- Users can insert their own archive record (on deletion request)
CREATE POLICY "Users can create own archive record"
ON public.archived_users
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = original_user_id);
