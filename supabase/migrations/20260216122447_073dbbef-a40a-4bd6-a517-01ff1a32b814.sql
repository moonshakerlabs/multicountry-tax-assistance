
-- Add SUPER_PRO to allowed subscription plans
ALTER TABLE public.user_subscriptions DROP CONSTRAINT user_subscriptions_subscription_plan_check;
ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_subscription_plan_check 
  CHECK (subscription_plan = ANY (ARRAY['FREE'::text, 'FREEMIUM'::text, 'PRO'::text, 'SUPER_PRO'::text]));
