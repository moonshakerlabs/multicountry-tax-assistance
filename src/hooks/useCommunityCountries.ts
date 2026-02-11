import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

export function useCommunityCountries() {
  const { user } = useAuth();
  const { getCountryLimit } = useSubscription();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCountries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_country_preferences')
      .select('country')
      .eq('user_id', user.id);
    if (data) {
      setSelectedCountries(data.map((d) => d.country));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  const setCountries = async (countries: string[]) => {
    if (!user) return;
    const limit = getCountryLimit();
    const trimmed = countries.slice(0, limit);

    // Delete existing
    await supabase
      .from('user_country_preferences')
      .delete()
      .eq('user_id', user.id);

    // Insert new
    if (trimmed.length > 0) {
      await supabase.from('user_country_preferences').insert(
        trimmed.map((country) => ({ user_id: user.id, country }))
      );
    }

    setSelectedCountries(trimmed);
  };

  return { selectedCountries, loading, setCountries, countryLimit: getCountryLimit() };
}
