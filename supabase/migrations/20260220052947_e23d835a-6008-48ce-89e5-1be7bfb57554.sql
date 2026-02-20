
-- Add column to store Google Drive permission IDs for revocation
-- Format: { "gdrive_file_id": "permission_id", ... }
ALTER TABLE public.document_shares
ADD COLUMN drive_permission_ids jsonb DEFAULT '{}'::jsonb;
