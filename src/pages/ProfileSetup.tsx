import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Check } from 'lucide-react';
import './ProfileSetup.css';

interface UserProfileData {
  primary_tax_residency: 'GERMANY' | 'INDIA';
  other_tax_countries: string[];
  preferred_language: 'EN' | 'DE';
}

const COUNTRIES = [
  { code: 'GERMANY', labelEn: 'Germany', labelDe: 'Deutschland' },
  { code: 'INDIA', labelEn: 'India', labelDe: 'Indien' },
];

const OTHER_COUNTRIES = [
  { code: 'USA', labelEn: 'United States', labelDe: 'Vereinigte Staaten' },
  { code: 'UK', labelEn: 'United Kingdom', labelDe: 'Vereinigtes Königreich' },
  { code: 'CANADA', labelEn: 'Canada', labelDe: 'Kanada' },
  { code: 'AUSTRALIA', labelEn: 'Australia', labelDe: 'Australien' },
  { code: 'SWITZERLAND', labelEn: 'Switzerland', labelDe: 'Schweiz' },
  { code: 'NETHERLANDS', labelEn: 'Netherlands', labelDe: 'Niederlande' },
  { code: 'FRANCE', labelEn: 'France', labelDe: 'Frankreich' },
  { code: 'SINGAPORE', labelEn: 'Singapore', labelDe: 'Singapur' },
  { code: 'UAE', labelEn: 'United Arab Emirates', labelDe: 'Vereinigte Arabische Emirate' },
];

export default function ProfileSetup() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  
  const [formData, setFormData] = useState<UserProfileData>({
    primary_tax_residency: 'GERMANY',
    other_tax_countries: [],
    preferred_language: 'EN',
  });

  // Fetch existing user profile
  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setFormData({
            primary_tax_residency: data.primary_tax_residency as 'GERMANY' | 'INDIA',
            other_tax_countries: data.other_tax_countries || [],
            preferred_language: data.preferred_language as 'EN' | 'DE',
          });
          setIsFirstTime(false);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsFetching(false);
      }
    }
    
    fetchUserProfile();
  }, [user]);

  const getLabel = (labelEn: string, labelDe?: string) => {
    if (formData.preferred_language === 'DE' && labelDe) {
      return labelDe;
    }
    return labelEn;
  };

  const handlePrimaryResidencyChange = (country: 'GERMANY' | 'INDIA') => {
    setFormData(prev => ({
      ...prev,
      primary_tax_residency: country,
      // Remove from other countries if selected as primary
      other_tax_countries: prev.other_tax_countries.filter(c => c !== country),
    }));
  };

  const handleOtherCountryToggle = (countryCode: string) => {
    setFormData(prev => {
      const isSelected = prev.other_tax_countries.includes(countryCode);
      return {
        ...prev,
        other_tax_countries: isSelected
          ? prev.other_tax_countries.filter(c => c !== countryCode)
          : [...prev.other_tax_countries, countryCode],
      };
    });
  };

  const handleLanguageChange = (language: 'EN' | 'DE') => {
    setFormData(prev => ({ ...prev, preferred_language: language }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('user_profile')
        .upsert({
          user_id: user.id,
          primary_tax_residency: formData.primary_tax_residency,
          other_tax_countries: formData.other_tax_countries,
          preferred_language: formData.preferred_language,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
      
      if (error) throw error;
      
      toast({
        title: formData.preferred_language === 'DE' ? 'Profil gespeichert' : 'Profile saved',
        description: formData.preferred_language === 'DE' 
          ? 'Ihre Einstellungen wurden aktualisiert.' 
          : 'Your preferences have been updated.',
      });
      
      navigate('/vault');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: formData.preferred_language === 'DE' ? 'Fehler' : 'Error',
        description: formData.preferred_language === 'DE'
          ? 'Profil konnte nicht gespeichert werden.'
          : 'Could not save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="profile-setup-container">
        <div className="profile-setup-loading">
          {formData.preferred_language === 'DE' ? 'Laden...' : 'Loading...'}
        </div>
      </div>
    );
  }

  const isDE = formData.preferred_language === 'DE';

  return (
    <div className="profile-setup-container">
      <div className="profile-setup-content">
        {/* Header */}
        <div className="profile-setup-header">
          <Link to="/vault" className="profile-setup-back">
            <ArrowLeft className="profile-setup-back-icon" />
            {isDE ? 'Zurück zum Tresor' : 'Back to Vault'}
          </Link>
        </div>

        <div className="profile-setup-card">
          <h1 className="profile-setup-title">
            {isFirstTime 
              ? (isDE ? 'Willkommen! Richten Sie Ihr Profil ein' : 'Welcome! Set up your profile')
              : (isDE ? 'Profileinstellungen bearbeiten' : 'Edit Profile Settings')}
          </h1>
          <p className="profile-setup-subtitle">
            {isDE 
              ? 'Helfen Sie uns, Ihre Steuerdokumente zu organisieren.'
              : 'Help us organise your tax documents.'}
          </p>

          <form onSubmit={handleSubmit} className="profile-setup-form">
            {/* Primary Tax Residency */}
            <div className="profile-setup-section">
              <Label className="profile-setup-label">
                {isDE ? 'Primärer Steuersitz *' : 'Primary Tax Residency *'}
              </Label>
              <p className="profile-setup-hint">
                {isDE 
                  ? 'Wählen Sie das Land Ihres Hauptsteuersitzes.'
                  : 'Select the country where you primarily pay taxes.'}
              </p>
              <div className="profile-setup-options">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    className={`profile-setup-option ${
                      formData.primary_tax_residency === country.code ? 'profile-setup-option-selected' : ''
                    }`}
                    onClick={() => handlePrimaryResidencyChange(country.code as 'GERMANY' | 'INDIA')}
                  >
                    <span className="profile-setup-option-text">
                      {getLabel(country.labelEn, country.labelDe)}
                    </span>
                    {formData.primary_tax_residency === country.code && (
                      <Check className="profile-setup-option-check" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Other Tax-Relevant Countries */}
            <div className="profile-setup-section">
              <Label className="profile-setup-label">
                {isDE ? 'Weitere steuerrelevante Länder' : 'Other Tax-Relevant Countries'}
              </Label>
              <p className="profile-setup-hint">
                {isDE 
                  ? 'Wählen Sie alle Länder aus, in denen Sie Einkommen erzielen oder Steuern zahlen.'
                  : 'Select any other countries where you have income or tax obligations.'}
              </p>
              <div className="profile-setup-multi-options">
                {/* Add the non-primary country from COUNTRIES */}
                {COUNTRIES.filter(c => c.code !== formData.primary_tax_residency).map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    className={`profile-setup-multi-option ${
                      formData.other_tax_countries.includes(country.code) ? 'profile-setup-multi-option-selected' : ''
                    }`}
                    onClick={() => handleOtherCountryToggle(country.code)}
                  >
                    {getLabel(country.labelEn, country.labelDe)}
                    {formData.other_tax_countries.includes(country.code) && (
                      <Check className="profile-setup-multi-check" />
                    )}
                  </button>
                ))}
                {OTHER_COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    className={`profile-setup-multi-option ${
                      formData.other_tax_countries.includes(country.code) ? 'profile-setup-multi-option-selected' : ''
                    }`}
                    onClick={() => handleOtherCountryToggle(country.code)}
                  >
                    {getLabel(country.labelEn, country.labelDe)}
                    {formData.other_tax_countries.includes(country.code) && (
                      <Check className="profile-setup-multi-check" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Language */}
            <div className="profile-setup-section">
              <Label className="profile-setup-label">
                {isDE ? 'Bevorzugte Sprache' : 'Preferred Language'}
              </Label>
              <p className="profile-setup-hint">
                {isDE 
                  ? 'Wählen Sie die Sprache für die Benutzeroberfläche.'
                  : 'Select your preferred language for the interface.'}
              </p>
              <div className="profile-setup-options">
                <button
                  type="button"
                  className={`profile-setup-option ${
                    formData.preferred_language === 'EN' ? 'profile-setup-option-selected' : ''
                  }`}
                  onClick={() => handleLanguageChange('EN')}
                >
                  <span className="profile-setup-option-text">
                    {isDE ? 'Englisch' : 'English'}
                  </span>
                  {formData.preferred_language === 'EN' && (
                    <Check className="profile-setup-option-check" />
                  )}
                </button>
                <button
                  type="button"
                  className={`profile-setup-option ${
                    formData.preferred_language === 'DE' ? 'profile-setup-option-selected' : ''
                  }`}
                  onClick={() => handleLanguageChange('DE')}
                >
                  <span className="profile-setup-option-text">
                    {isDE ? 'Deutsch' : 'German'}
                  </span>
                  {formData.preferred_language === 'DE' && (
                    <Check className="profile-setup-option-check" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="profile-setup-actions">
              <Button type="submit" disabled={isLoading} className="profile-setup-submit">
                {isLoading 
                  ? (isDE ? 'Speichern...' : 'Saving...') 
                  : (isDE ? 'Profil speichern' : 'Save Profile')}
              </Button>
              {!isFirstTime && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/vault')}
                  disabled={isLoading}
                >
                  {isDE ? 'Abbrechen' : 'Cancel'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
