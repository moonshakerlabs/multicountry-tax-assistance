import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useStoragePreference } from '@/hooks/useStoragePreference';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ChevronDown, Check, X, Cloud, HardDrive, AlertCircle, Unlink, Loader2 } from 'lucide-react';
import { 
  ALL_COUNTRIES, 
  getLanguagesForCountries, 
  getCountryDisplayName,
  getOtherCountriesOptions,
  type Country,
  type Language
} from '@/lib/countryLanguageData';
import './Profile.css';
import GoogleDriveSetupModal from '@/components/documents/GoogleDriveSetupModal';

interface UserProfile {
  user_id: string;
  primary_tax_residency: string;
  other_tax_countries: string[];
  preferred_language: string;
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    storagePreference,
    gdprConsentGiven,
    googleDriveConnected,
    setStoragePreference,
    setGDPRConsent,
    refresh: refreshStoragePreference,
  } = useStoragePreference();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [primaryTaxResidency, setPrimaryTaxResidency] = useState('GERMANY');
  const [otherTaxCountries, setOtherTaxCountries] = useState<string[]>([]);
  const [preferredLanguage, setPreferredLanguage] = useState('EN');
  const [isLoading, setIsLoading] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [userProfileData, setUserProfileData] = useState<UserProfile | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showGoogleDriveSetup, setShowGoogleDriveSetup] = useState(false);
  const [pendingOAuthCode, setPendingOAuthCode] = useState<string | null>(null);

  // Available languages based on primary tax residency AND other tax countries
  const availableLanguages = getLanguagesForCountries(primaryTaxResidency, otherTaxCountries);
  const otherCountriesOptions = getOtherCountriesOptions(primaryTaxResidency);

  // Handle Google Drive OAuth callback on Profile page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('gdrive_oauth_state');
    if (code && state && storedState === state) {
      // Clean URL immediately
      window.history.replaceState({}, '', window.location.pathname);
      setPendingOAuthCode(code);
      setShowGoogleDriveSetup(true);
    }
  }, []);

  // Load existing profile data
  useEffect(() => {
    async function loadProfile() {
      if (profile) {
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
      }

      if (user) {
        const { data: userProfile } = await supabase
          .from('user_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userProfile) {
          setUserProfileData(userProfile);
          setPrimaryTaxResidency(userProfile.primary_tax_residency || 'GERMANY');
          setOtherTaxCountries(userProfile.other_tax_countries || []);
          setPreferredLanguage(userProfile.preferred_language || 'EN');
        }
      }
    }
    loadProfile();
  }, [profile, user]);

  // Reset language when primary tax residency or other countries change
  useEffect(() => {
    const languages = getLanguagesForCountries(primaryTaxResidency, otherTaxCountries);
    const currentLangAvailable = languages.some(l => l.code === preferredLanguage && l.enabled);
    if (!currentLangAvailable) {
      setPreferredLanguage('EN');
    }
  }, [primaryTaxResidency, otherTaxCountries, preferredLanguage]);

  // Remove primary country from other countries if selected
  useEffect(() => {
    setOtherTaxCountries(prev => prev.filter(c => c !== primaryTaxResidency));
  }, [primaryTaxResidency]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOtherCountry = (countryCode: string, enabled: boolean) => {
    if (!enabled) return;
    setOtherTaxCountries(prev => 
      prev.includes(countryCode) 
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  const removeOtherCountry = (countryCode: string) => {
    setOtherTaxCountries(prev => prev.filter(c => c !== countryCode));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);

    try {
      // Update profiles table (first/last name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          preferred_language: preferredLanguage.toLowerCase(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Upsert user_profile table
      const { error: userProfileError } = await supabase
        .from('user_profile')
        .upsert({
          user_id: user.id,
          primary_tax_residency: primaryTaxResidency,
          other_tax_countries: otherTaxCountries,
          preferred_language: preferredLanguage,
        }, {
          onConflict: 'user_id'
        });

      if (userProfileError) throw userProfileError;

      await refreshProfile();
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.'
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLanguageLabel = (lang: Language): string => {
    return lang.nameNative !== lang.nameEn 
      ? `${lang.nameNative} (${lang.nameEn})`
      : lang.nameEn;
  };

  return (
    <div className="profile-container">
      {/* Header */}
      <header className="profile-header">
        <div className="profile-header-content">
          <Link to="/dashboard" className="profile-back-link">
            <ArrowLeft className="profile-back-icon" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="profile-main">
        <div className="profile-title-section">
          <h1 className="profile-title">Edit Profile</h1>
          <p className="profile-subtitle">
            Update your personal information and tax preferences.
          </p>
        </div>

        <div className="profile-card">
          <form onSubmit={handleSubmit} className="profile-form">
            {/* Email (read-only) */}
            <div className="profile-field">
              <label className="profile-label">Email</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="profile-input"
              />
              <span className="profile-hint">Email cannot be changed.</span>
            </div>

            {/* Name fields */}
            <div className="profile-field-row">
              <div className="profile-field">
                <label className="profile-label">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  disabled={isLoading}
                  className="profile-input"
                />
              </div>
              <div className="profile-field">
                <label className="profile-label">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  disabled={isLoading}
                  className="profile-input"
                />
              </div>
            </div>

            <div className="profile-section-divider" />
            <h3 className="profile-section-title">Tax Residency</h3>

            {/* Primary Tax Residency */}
            <div className="profile-field">
              <label className="profile-label">Primary Tax Residency *</label>
              <select
                value={primaryTaxResidency}
                onChange={(e) => setPrimaryTaxResidency(e.target.value)}
                disabled={isLoading}
                className="profile-select"
              >
                {ALL_COUNTRIES.map(country => (
                  <option 
                    key={country.code} 
                    value={country.code}
                    disabled={!country.enabled}
                  >
                    {country.nameNative !== country.nameEn 
                      ? `${country.nameEn} (${country.nameNative})`
                      : country.nameEn}
                    {!country.enabled ? ' - Coming soon' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Other Tax-Relevant Countries (Multi-select) */}
            <div className="profile-field">
              <label className="profile-label">Other Tax-Relevant Countries</label>
              <span className="profile-hint">Select countries where you have additional tax obligations</span>
              
              <div className="profile-multiselect-container" ref={dropdownRef}>
                <button
                  type="button"
                  className="profile-multiselect-trigger"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  disabled={isLoading}
                >
                  <span className={otherTaxCountries.length === 0 ? 'profile-multiselect-placeholder' : ''}>
                    {otherTaxCountries.length === 0 
                      ? 'Select countries...' 
                      : `${otherTaxCountries.length} country(ies) selected`}
                  </span>
                  <ChevronDown className="profile-back-icon" />
                </button>

                {showCountryDropdown && (
                  <div className="profile-multiselect-dropdown">
                    {otherCountriesOptions.map(country => (
                      <div
                        key={country.code}
                        className={`profile-multiselect-option ${!country.enabled ? 'profile-multiselect-option-disabled' : ''}`}
                        onClick={() => toggleOtherCountry(country.code, country.enabled)}
                      >
                        <div className={`profile-multiselect-checkbox ${otherTaxCountries.includes(country.code) ? 'profile-multiselect-checkbox-checked' : ''}`}>
                          {otherTaxCountries.includes(country.code) && <Check className="w-3 h-3" />}
                        </div>
                        <span className="profile-multiselect-label">
                          {country.nameNative !== country.nameEn 
                            ? `${country.nameEn} (${country.nameNative})`
                            : country.nameEn}
                        </span>
                        {!country.enabled && (
                          <span className="profile-multiselect-coming-soon">Coming soon</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected countries chips */}
              {otherTaxCountries.length > 0 && (
                <div className="profile-selected-countries">
                  {otherTaxCountries.map(code => {
                    const country = ALL_COUNTRIES.find(c => c.code === code);
                    return (
                      <span key={code} className="profile-country-chip">
                        {country?.nameEn || code}
                        <span 
                          className="profile-country-chip-remove"
                          onClick={() => removeOtherCountry(code)}
                        >
                          <X className="w-2.5 h-2.5" />
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="profile-section-divider" />
            <h3 className="profile-section-title">Preferences</h3>

            {/* Storage Preference */}
            <div className="profile-field">
              <label className="profile-label">Document Storage</label>
              <div className="profile-storage-options">
                <div 
                  className={`profile-storage-option ${storagePreference === 'saas' ? 'profile-storage-option-selected' : ''}`}
                  onClick={() => !isLoading && setStoragePreference('saas')}
                >
                  <Cloud className="w-5 h-5" />
                  <div>
                    <strong>Platform Storage</strong>
                    <span>{gdprConsentGiven ? '✓ GDPR consent given' : 'GDPR consent required'}</span>
                  </div>
                </div>
                <div 
                  className={`profile-storage-option ${storagePreference === 'google_drive' ? 'profile-storage-option-selected' : ''}`}
                  onClick={() => !isLoading && setStoragePreference('google_drive')}
                >
                  <HardDrive className="w-5 h-5" />
                  <div>
                    <strong>Google Drive</strong>
                    <span>{googleDriveConnected ? '✓ Connected' : 'Not connected'}</span>
                  </div>
                </div>
              </div>
              {storagePreference === 'google_drive' && !googleDriveConnected && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowGoogleDriveSetup(true)}
                >
                  <HardDrive className="w-4 h-4 mr-1" /> Connect Google Drive
                </Button>
              )}
              {googleDriveConnected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={isDisconnecting}
                  onClick={async () => {
                    setIsDisconnecting(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) throw new Error('Not logged in');
                      
                      const response = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-auth`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({ action: 'disconnect' }),
                        }
                      );
                      
                      if (!response.ok) throw new Error('Disconnect failed');
                      
                      await refreshStoragePreference();
                      toast({
                        title: 'Google Drive disconnected',
                        description: 'Your existing files in Google Drive are preserved.',
                      });
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error.message || 'Could not disconnect Google Drive.',
                        variant: 'destructive',
                      });
                    } finally {
                      setIsDisconnecting(false);
                    }
                  }}
                >
                  {isDisconnecting ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Disconnecting...</>
                  ) : (
                    <><Unlink className="w-4 h-4 mr-1" /> Disconnect Google Drive</>
                  )}
                </Button>
              )}
              <span className="profile-hint">
                Choose where your tax documents are stored
              </span>
            </div>

            {/* Preferred Language */}
            <div className="profile-field">
              <label className="profile-label">Preferred Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                disabled={isLoading}
                className="profile-select"
              >
                {availableLanguages.map(lang => (
                  <option 
                    key={lang.code} 
                    value={lang.code}
                    disabled={!lang.enabled}
                  >
                    {getLanguageLabel(lang)}
                    {!lang.enabled ? ' - Coming soon' : ''}
                  </option>
                ))}
              </select>
              <span className="profile-hint">
                Available languages depend on your selected tax countries
              </span>
            </div>

            {/* Actions */}
            <div className="profile-actions">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/dashboard')} 
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>

        {/* Google Drive Setup Modal */}
        {showGoogleDriveSetup && (
          <GoogleDriveSetupModal
            isDE={false}
            pendingOAuthCode={pendingOAuthCode}
            onComplete={async (folderId) => {
              try {
                const { error } = await supabase
                  .from('user_profile')
                  .upsert({
                    user_id: user!.id,
                    google_drive_folder_id: folderId,
                    google_drive_connected: true,
                  }, { onConflict: 'user_id' });
                if (error) throw error;
                await refreshStoragePreference();
                setPendingOAuthCode(null);
                setShowGoogleDriveSetup(false);
                toast({
                  title: 'Google Drive connected',
                  description: 'Your Google Drive is now set up for document storage.',
                });
              } catch (error: any) {
                toast({
                  title: 'Error',
                  description: error.message || 'Could not save connection.',
                  variant: 'destructive',
                });
              }
            }}
            onCancel={() => {
              setPendingOAuthCode(null);
              setShowGoogleDriveSetup(false);
            }}
            userEmail={profile?.email}
          />
        )}
      </main>
    </div>
  );
}
