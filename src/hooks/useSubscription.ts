import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SubscriptionData {
  subscription_plan: string;
  billing_cycle: string;
  subscription_status: string;
  is_legacy_user: boolean;
  points_balance: number;
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  subscription_plan: 'FREE',
  billing_cycle: 'MONTHLY',
  subscription_status: 'ACTIVE',
  is_legacy_user: false,
  points_balance: 0,
};

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>(DEFAULT_SUBSCRIPTION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(DEFAULT_SUBSCRIPTION);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('subscription_plan, billing_cycle, subscription_status, is_legacy_user, points_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && !error) {
        setSubscription(data as SubscriptionData);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  const getCountryLimit = (): number => {
    switch (subscription.subscription_plan) {
      case 'SUPER_PRO': return 999;
      case 'PRO': return 5;
      case 'FREEMIUM': return 2;
      default: return 1;
    }
  };

  const getPostingLimit = (): { count: number; period: string } | null => {
    switch (subscription.subscription_plan) {
      case 'SUPER_PRO': return null; // unlimited
      case 'PRO': return { count: 50, period: 'month' };
      case 'FREEMIUM': return { count: 10, period: 'month' };
      default: return { count: 1, period: 'month' };
    }
  };

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('subscription_plan, billing_cycle, subscription_status, is_legacy_user, points_balance')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data && !error) {
      setSubscription(data as SubscriptionData);
    }
    setLoading(false);
  };

  return { subscription, loading, getCountryLimit, getPostingLimit, refetch };
}
