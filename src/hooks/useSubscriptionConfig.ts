import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionConfig {
  default_trial_days: number;
  default_trial_plan: string;
  early_access_enabled: boolean;
  early_access_deadline: string;
  early_access_freemium_days: number;
  early_access_pro_days: number;
  early_access_headline: string;
  early_access_description: string;
  downgrade_cutoff_days: number;
  vault_grace_period_days: number;
}

const DEFAULT_CONFIG: SubscriptionConfig = {
  default_trial_days: 30,
  default_trial_plan: 'PRO',
  early_access_enabled: false,
  early_access_deadline: '',
  early_access_freemium_days: 180,
  early_access_pro_days: 90,
  early_access_headline: '🚀 Early Access Offer',
  early_access_description: 'Sign up now and get premium features free!',
  downgrade_cutoff_days: 3,
  vault_grace_period_days: 30,
};

export function useSubscriptionConfig() {
  const [config, setConfig] = useState<SubscriptionConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_config' as any)
        .select('config_key, config_value');

      if (error) throw error;

      const configMap: Record<string, string> = {};
      (data as any[])?.forEach((row: any) => {
        configMap[row.config_key] = row.config_value;
      });

      setConfig({
        default_trial_days: parseInt(configMap['default_trial_days'] || '30'),
        default_trial_plan: configMap['default_trial_plan'] || 'PRO',
        early_access_enabled: configMap['early_access_enabled'] === 'true',
        early_access_deadline: configMap['early_access_deadline'] || '',
        early_access_freemium_days: parseInt(configMap['early_access_freemium_days'] || '180'),
        early_access_pro_days: parseInt(configMap['early_access_pro_days'] || '90'),
        early_access_headline: configMap['early_access_headline'] || DEFAULT_CONFIG.early_access_headline,
        early_access_description: configMap['early_access_description'] || DEFAULT_CONFIG.early_access_description,
        downgrade_cutoff_days: parseInt(configMap['downgrade_cutoff_days'] || '3'),
        vault_grace_period_days: parseInt(configMap['vault_grace_period_days'] || '30'),
      });
    } catch (e) {
      console.error('Error fetching subscription config:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const isEarlyAccessActive = (): boolean => {
    if (!config.early_access_enabled) return false;
    if (!config.early_access_deadline) return false;
    return new Date() < new Date(config.early_access_deadline + 'T23:59:59');
  };

  const getDaysRemaining = (): number => {
    if (!config.early_access_deadline) return 0;
    const deadline = new Date(config.early_access_deadline + 'T23:59:59');
    const now = new Date();
    return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  return { config, loading, isEarlyAccessActive, getDaysRemaining, refetch: fetchConfig };
}
