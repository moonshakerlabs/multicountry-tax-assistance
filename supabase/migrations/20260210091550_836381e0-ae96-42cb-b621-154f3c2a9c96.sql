
-- Create secure table for Google Drive OAuth tokens
CREATE TABLE public.google_drive_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  google_email TEXT,
  root_folder_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_drive_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view their own drive tokens"
ON public.google_drive_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drive tokens"
ON public.google_drive_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drive tokens"
ON public.google_drive_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drive tokens"
ON public.google_drive_tokens FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_google_drive_tokens_updated_at
BEFORE UPDATE ON public.google_drive_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
