
-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_plan TEXT NOT NULL DEFAULT 'FREE' CHECK (subscription_plan IN ('FREE', 'FREEMIUM', 'PRO')),
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY', 'YEARLY')),
  subscription_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (subscription_status IN ('ACTIVE', 'CANCELLED', 'EXPIRED')),
  subscription_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  legacy_price_amount NUMERIC(10, 2),
  is_legacy_user BOOLEAN NOT NULL DEFAULT false,
  legacy_valid_until TIMESTAMP WITH TIME ZONE,
  subscription_price_at_signup NUMERIC(10, 2),
  points_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create subscription_history table
CREATE TABLE public.subscription_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('FREE', 'FREEMIUM', 'PRO')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'YEARLY')),
  price_at_purchase NUMERIC(10, 2) NOT NULL,
  is_legacy_applied BOOLEAN NOT NULL DEFAULT false,
  change_type TEXT NOT NULL CHECK (change_type IN ('UPGRADE', 'DOWNGRADE', 'CANCEL', 'RENEW')),
  change_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own subscription history"
  ON public.subscription_history FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription history"
  ON public.subscription_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all subscription history"
  ON public.subscription_history FOR SELECT
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));
