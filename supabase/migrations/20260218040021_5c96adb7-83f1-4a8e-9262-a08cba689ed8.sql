
-- User security settings table
CREATE TABLE IF NOT EXISTS public.user_security_settings (
  user_id UUID NOT NULL PRIMARY KEY,
  two_fa_enabled BOOLEAN NOT NULL DEFAULT true,
  two_fa_verified BOOLEAN NOT NULL DEFAULT false,
  session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  security_question_1 TEXT,
  security_answer_1 TEXT,
  security_question_2 TEXT,
  security_answer_2 TEXT,
  security_question_3 TEXT,
  security_answer_3 TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own security settings"
  ON public.user_security_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security settings"
  ON public.user_security_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings"
  ON public.user_security_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all security settings"
  ON public.user_security_settings FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

CREATE TRIGGER update_user_security_settings_updated_at
  BEFORE UPDATE ON public.user_security_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OTP verification table
CREATE TABLE IF NOT EXISTS public.user_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  otp_type TEXT NOT NULL DEFAULT 'login',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own OTPs"
  ON public.user_otps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage OTPs"
  ON public.user_otps FOR ALL
  USING (true)
  WITH CHECK (true);
