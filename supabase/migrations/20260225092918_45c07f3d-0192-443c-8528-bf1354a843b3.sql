
-- Create vault scan history table
CREATE TABLE public.vault_scan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instruction TEXT NOT NULL,
  result_summary TEXT,
  file_count INTEGER NOT NULL DEFAULT 0,
  file_names TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vault_scan_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own scan history
CREATE POLICY "Users can view their own scan history"
ON public.vault_scan_history
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can insert their own scan history
CREATE POLICY "Users can insert their own scan history"
ON public.vault_scan_history
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can delete their own scan history
CREATE POLICY "Users can delete their own scan history"
ON public.vault_scan_history
FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Admins can view all scan history
CREATE POLICY "Admins can view all scan history"
ON public.vault_scan_history
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));
