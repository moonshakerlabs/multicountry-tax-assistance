
-- Add 2FA method and phone number to user_security_settings
ALTER TABLE public.user_security_settings 
  ADD COLUMN IF NOT EXISTS two_fa_method text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS two_fa_phone_number text;
