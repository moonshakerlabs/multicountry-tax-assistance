
-- Fix overly permissive OTP policy: drop the "always true" service role policy
-- Edge functions use service role key which bypasses RLS entirely, so no open policy needed
DROP POLICY IF EXISTS "Service role can manage OTPs" ON public.user_otps;
