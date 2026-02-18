
-- Create sequence for meaningful user IDs
CREATE SEQUENCE IF NOT EXISTS public.user_sequential_id_seq START 1;

-- Add meaningful_user_id column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS meaningful_user_id TEXT UNIQUE;

-- Function to generate meaningful user ID: ddmmyy + 4-digit sequence
CREATE OR REPLACE FUNCTION public.generate_meaningful_user_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  date_part TEXT;
  seq_num INTEGER;
  result TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'DDMMYY');
  seq_num := NEXTVAL('public.user_sequential_id_seq');
  result := date_part || LPAD(seq_num::TEXT, 4, '0');
  RETURN result;
END;
$$;

-- Trigger to auto-assign meaningful_user_id on profile insert
CREATE OR REPLACE FUNCTION public.assign_meaningful_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.meaningful_user_id IS NULL THEN
    NEW.meaningful_user_id := public.generate_meaningful_user_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_user_id_trigger ON public.profiles;
CREATE TRIGGER assign_user_id_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_meaningful_user_id();

-- Update existing profiles with meaningful IDs
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE meaningful_user_id IS NULL ORDER BY created_at LOOP
    UPDATE public.profiles 
    SET meaningful_user_id = public.generate_meaningful_user_id()
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- Support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  meaningful_user_id TEXT,
  email TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'MINOR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_reply_at TIMESTAMP WITH TIME ZONE
);

-- Support ticket replies table
CREATE TABLE IF NOT EXISTS public.support_ticket_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID,
  sender_type TEXT NOT NULL, -- 'customer' or 'employee'
  sender_email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  seq_num := NEXTVAL('public.support_ticket_seq');
  RETURN 'TKT-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$;

-- Trigger to auto-assign ticket number
CREATE OR REPLACE FUNCTION public.assign_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_ticket_number_trigger ON public.support_tickets;
CREATE TRIGGER assign_ticket_number_trigger
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_ticket_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_support_ticket_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_ticket_updated_at ON public.support_tickets;
CREATE TRIGGER support_ticket_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_ticket_updated_at();

-- Auto-update priority to HIGH after 24 hours with no reply
CREATE OR REPLACE FUNCTION public.auto_escalate_ticket_priority()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a reply is added, update the ticket's last_reply_at
  UPDATE public.support_tickets
  SET last_reply_at = NOW()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_ticket_last_reply ON public.support_ticket_replies;
CREATE TRIGGER update_ticket_last_reply
  AFTER INSERT ON public.support_ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_escalate_ticket_priority();

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

CREATE POLICY "Admins can update all tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

-- RLS Policies for support_ticket_replies
CREATE POLICY "Users can view replies for their tickets"
  ON public.support_ticket_replies FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND st.user_id = auth.uid())
    OR is_any_admin(auth.uid())
  ));

CREATE POLICY "Authenticated users can insert replies"
  ON public.support_ticket_replies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add support module permissions for existing roles
INSERT INTO public.role_permissions (role, module, can_read, can_write)
VALUES 
  ('employee_admin', 'support', true, true),
  ('user_admin', 'support', true, false)
ON CONFLICT DO NOTHING;

-- Add India tax year preference to user_profile
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS india_tax_year_type TEXT DEFAULT 'tax_year';
