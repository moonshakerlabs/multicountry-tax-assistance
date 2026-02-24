import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';

interface PlanFeatureMapping {
  feature_key: string;
  enabled: boolean;
}

export function useFeatureAccess() {
  const { subscription, loading: subLoading } = useSubscription();
  const [featureMap, setFeatureMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      const planKey = subscription.subscription_plan || 'FREE';
      const { data } = await (supabase as any)
        .from('plan_feature_mapping')
        .select('feature_key, enabled')
        .eq('plan_key', planKey);
      
      const map: Record<string, boolean> = {};
      ((data as PlanFeatureMapping[]) || []).forEach(f => {
        map[f.feature_key] = f.enabled;
      });
      setFeatureMap(map);
      setLoading(false);
    };

    if (!subLoading) {
      fetchFeatures();
    }
  }, [subscription.subscription_plan, subLoading]);

  const hasFeature = (featureKey: string): boolean => {
    return featureMap[featureKey] === true;
  };

  return { hasFeature, featureMap, loading: loading || subLoading };
}
