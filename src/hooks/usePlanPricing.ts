import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlanPrice {
  plan_key: string;
  billing_cycle: string;
  price: number;
  currency: string;
  is_active: boolean;
}

export function usePlanPricing() {
  const [pricing, setPricing] = useState<PlanPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPricing = async () => {
      const { data } = await (supabase as any)
        .from('plan_pricing')
        .select('plan_key, billing_cycle, price, currency, is_active')
        .eq('is_active', true);
      setPricing((data as PlanPrice[]) || []);
      setLoading(false);
    };
    fetchPricing();
  }, []);

  const getPrice = (planKey: string, billingCycle: string): number => {
    const p = pricing.find(x => x.plan_key === planKey && x.billing_cycle === billingCycle);
    return p?.price ?? 0;
  };

  return { pricing, loading, getPrice };
}
