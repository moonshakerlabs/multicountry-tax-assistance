-- Add storage preference columns to user_profile table
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS storage_preference TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gdpr_consent_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gdpr_consent_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS google_drive_connected BOOLEAN DEFAULT FALSE;

-- Add constraint for valid storage preference values
ALTER TABLE public.user_profile
ADD CONSTRAINT storage_preference_check 
CHECK (storage_preference IS NULL OR storage_preference IN ('saas', 'google_drive'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profile_storage_preference ON public.user_profile(storage_preference);

-- Comment on columns for documentation
COMMENT ON COLUMN public.user_profile.storage_preference IS 'User choice for document storage: saas (platform storage) or google_drive';
COMMENT ON COLUMN public.user_profile.gdpr_consent_given IS 'Whether user has given GDPR consent for SaaS storage';
COMMENT ON COLUMN public.user_profile.gdpr_consent_date IS 'Timestamp when GDPR consent was given';
COMMENT ON COLUMN public.user_profile.google_drive_folder_id IS 'Master folder ID in user Google Drive';
COMMENT ON COLUMN public.user_profile.google_drive_connected IS 'Whether Google Drive is connected and verified';