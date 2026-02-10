
-- 1. Add share_enabled column to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false;

-- 2. Create document_shares table
CREATE TABLE public.document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_type text NOT NULL CHECK (share_type IN ('single', 'multiple')),
  document_ids uuid[] NOT NULL,
  recipient_email text NOT NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('ca', 'family', 'other')),
  recipient_metadata jsonb DEFAULT '{}'::jsonb,
  allow_download boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REVOKED')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Create share_audit_log table
CREATE TABLE public.share_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.document_shares(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recipient_email text NOT NULL,
  recipient_type text NOT NULL,
  recipient_metadata jsonb DEFAULT '{}'::jsonb,
  share_type text NOT NULL,
  email_status text NOT NULL DEFAULT 'PENDING',
  otp_verified_at timestamp with time zone,
  access_expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Enable RLS on both tables
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_audit_log ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for document_shares
CREATE POLICY "Users can view their own shares"
ON public.document_shares FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own shares"
ON public.document_shares FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own shares"
ON public.document_shares FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own shares"
ON public.document_shares FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 6. RLS policies for share_audit_log
CREATE POLICY "Users can view their own audit logs"
ON public.share_audit_log FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
ON public.share_audit_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 7. Index for fast token lookups
CREATE INDEX idx_document_shares_token ON public.document_shares(token);
CREATE INDEX idx_document_shares_user_id ON public.document_shares(user_id);
CREATE INDEX idx_document_shares_status ON public.document_shares(status);
