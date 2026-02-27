
-- Feedback questions created by admin
CREATE TABLE public.feedback_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'rating', -- 'rating', 'multiple_choice', 'text'
  options JSONB DEFAULT '[]'::jsonb, -- for multiple_choice: ["option1","option2",...]
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feedback questions"
  ON public.feedback_questions FOR ALL
  USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

CREATE POLICY "Public can view active feedback questions"
  ON public.feedback_questions FOR SELECT
  USING (is_active = true);

-- User feedback responses
CREATE TABLE public.feedback_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.feedback_questions(id) ON DELETE CASCADE,
  rating INTEGER, -- for rating questions (1-5)
  selected_option TEXT, -- for multiple choice
  text_response TEXT, -- for text questions
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
  ON public.feedback_responses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
  ON public.feedback_responses FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON public.feedback_responses FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

-- Add unique constraint so user can only answer each question once
ALTER TABLE public.feedback_responses ADD CONSTRAINT unique_user_question UNIQUE (user_id, question_id);

-- Payment gateway config
INSERT INTO public.subscription_config (config_key, config_value, description)
VALUES ('PAYMENT_GATEWAY', 'RAZORPAY', 'Active payment gateway provider. Options: RAZORPAY, STRIPE, PAYPAL')
ON CONFLICT DO NOTHING;
