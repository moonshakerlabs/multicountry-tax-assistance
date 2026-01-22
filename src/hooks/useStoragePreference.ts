import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type StoragePreference = 'saas' | 'google_drive' | null;

interface StoragePreferenceData {
  storage_preference: StoragePreference;
  gdpr_consent_given: boolean;
  gdpr_consent_date: string | null;
  google_drive_folder_id: string | null;
  google_drive_connected: boolean;
}

interface UseStoragePreferenceReturn {
  storagePreference: StoragePreference;
  gdprConsentGiven: boolean;
  googleDriveConnected: boolean;
  googleDriveFolderId: string | null;
  loading: boolean;
  needsStorageChoice: boolean;
  setStoragePreference: (preference: StoragePreference) => Promise<void>;
  setGDPRConsent: (consent: boolean) => Promise<void>;
  setGoogleDriveConnection: (folderId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useStoragePreference(): UseStoragePreferenceReturn {
  const { user } = useAuth();
  const [data, setData] = useState<StoragePreferenceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStoragePreference = async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('user_profile')
        .select('storage_preference, gdpr_consent_given, gdpr_consent_date, google_drive_folder_id, google_drive_connected')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching storage preference:', error);
        setData(null);
      } else if (profile) {
        setData(profile as StoragePreferenceData);
      } else {
        // No profile exists yet
        setData({
          storage_preference: null,
          gdpr_consent_given: false,
          gdpr_consent_date: null,
          google_drive_folder_id: null,
          google_drive_connected: false,
        });
      }
    } catch (error) {
      console.error('Error fetching storage preference:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoragePreference();
  }, [user]);

  const setStoragePreference = async (preference: StoragePreference) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_profile')
      .upsert({
        user_id: user.id,
        storage_preference: preference,
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error updating storage preference:', error);
      throw error;
    }

    await fetchStoragePreference();
  };

  const setGDPRConsent = async (consent: boolean) => {
    if (!user) return;

    const updateData: any = {
      user_id: user.id,
      gdpr_consent_given: consent,
    };

    if (consent) {
      updateData.gdpr_consent_date = new Date().toISOString();
    } else {
      updateData.gdpr_consent_date = null;
    }

    const { error } = await supabase
      .from('user_profile')
      .upsert(updateData, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error updating GDPR consent:', error);
      throw error;
    }

    await fetchStoragePreference();
  };

  const setGoogleDriveConnection = async (folderId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_profile')
      .upsert({
        user_id: user.id,
        google_drive_folder_id: folderId,
        google_drive_connected: true,
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error updating Google Drive connection:', error);
      throw error;
    }

    await fetchStoragePreference();
  };

  // User needs to make a storage choice if they haven't selected one yet
  const needsStorageChoice = !loading && data !== null && data.storage_preference === null;

  return {
    storagePreference: data?.storage_preference ?? null,
    gdprConsentGiven: data?.gdpr_consent_given ?? false,
    googleDriveConnected: data?.google_drive_connected ?? false,
    googleDriveFolderId: data?.google_drive_folder_id ?? null,
    loading,
    needsStorageChoice,
    setStoragePreference,
    setGDPRConsent,
    setGoogleDriveConnection,
    refresh: fetchStoragePreference,
  };
}
