import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useStoragePreference } from '@/hooks/useStoragePreference';
import { useSubscription } from '@/hooks/useSubscription';
import { useSubscriptionConfig } from '@/hooks/useSubscriptionConfig';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ChevronDown, Check, X, Cloud, HardDrive, Unlink, Loader2, User, Settings, Trash2, AlertTriangle, ArrowDown, CreditCard } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { 
  ALL_COUNTRIES, 
  getLanguagesForCountries, 
  getOtherCountriesOptions,
  type Language
} from '@/lib/countryLanguageData';
import './Profile.css';
import GoogleDriveSetupModal from '@/components/documents/GoogleDriveSetupModal';
import GDPRConsentModal from '@/components/documents/GDPRConsentModal';
import SecuritySettings from '@/components/profile/SecuritySettings';


type Tab = 'preferences' | 'settings' | 'subscription' | 'danger';

export default function Profile() {
  const { user, profile, refreshProfile, signOut, userRoles, isSuperAdmin } = useAuth();
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
  
  const { subscription, loading: subLoading } = useSubscription();
  const { config } = useSubscriptionConfig();
  
  const [activeTab, setActiveTab] = useState<Tab>('preferences');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [primaryTaxResidency, setPrimaryTaxResidency] = useState('GERMANY');
  const [otherTaxCountries, setOtherTaxCountries] = useState<string[]>([]);
  const [preferredLanguage, setPreferredLanguage] = useState('EN');
  const [indiaTaxYearType, setIndiaTaxYearType] = useState<'tax_year' | 'calendar_year'>('tax_year');
  const [isLoading, setIsLoading] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionReasonOther, setDeletionReasonOther] = useState('');
  const [showGoogleDriveSetup, setShowGoogleDriveSetup] = useState(false);
  const [showGDPRConsent, setShowGDPRConsent] = useState(false);
  const [pendingOAuthCode, setPendingOAuthCode] = useState<string | null>(null);
  const [showDowngrade, setShowDowngrade] = useState(false);
  const [downgradeTarget, setDowngradeTarget] = useState('');
  const [downgradeReason, setDowngradeReason] = useState('');
  const [downgradeReasonOther, setDowngradeReasonOther] = useState('');
  const [isDowngrading, setIsDowngrading] = useState(false);

  const isFreeUser = subscription.subscription_plan === 'FREE';

  const availableLanguages = getLanguagesForCountries(primaryTaxResidency, otherTaxCountries);
  const otherCountriesOptions = getOtherCountriesOptions(primaryTaxResidency);

  // Handle Google Drive OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('gdrive_oauth_state');
    if (code && state && storedState === state) {
      window.history.replaceState({}, '', window.location.pathname);
      setPendingOAuthCode(code);
      setShowGoogleDriveSetup(true);
    }
  }, []);

  // Load profile data
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
          setPrimaryTaxResidency(userProfile.primary_tax_residency || 'GERMANY');
          setOtherTaxCountries(userProfile.other_tax_countries || []);
          setPreferredLanguage(userProfile.preferred_language || 'EN');
          setIndiaTaxYearType((userProfile as any).india_tax_year_type || 'tax_year');
        }
      }
    }
    loadProfile();
  }, [profile, user]);

  useEffect(() => {
    const languages = getLanguagesForCountries(primaryTaxResidency, otherTaxCountries);
    const currentLangAvailable = languages.some(l => l.code === preferredLanguage && l.enabled);
    if (!currentLangAvailable) setPreferredLanguage('EN');
  }, [primaryTaxResidency, otherTaxCountries, preferredLanguage]);

  useEffect(() => {
    setOtherTaxCountries(prev => prev.filter(c => c !== primaryTaxResidency));
  }, [primaryTaxResidency]);

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
      prev.includes(countryCode) ? prev.filter(c => c !== countryCode) : [...prev, countryCode]
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
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ first_name: firstName, last_name: lastName, preferred_language: preferredLanguage.toLowerCase() })
        .eq('id', user.id);
      if (profileError) throw profileError;

      const { error: userProfileError } = await supabase
        .from('user_profile')
        .upsert({ user_id: user.id, primary_tax_residency: primaryTaxResidency, other_tax_countries: otherTaxCountries, preferred_language: preferredLanguage, india_tax_year_type: indiaTaxYearType } as any, { onConflict: 'user_id' });
      if (userProfileError) throw userProfileError;

      await refreshProfile();
      toast({ title: 'Profile updated', description: 'Your profile has been updated successfully.' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const getLanguageLabel = (lang: Language): string =>
    lang.nameNative !== lang.nameEn ? `${lang.nameNative} (${lang.nameEn})` : lang.nameEn;

  // Roles that cannot delete their own accounts
  const isAdminRole = userRoles.some(r => ['employee_admin', 'user_admin'].includes(r)) && !isSuperAdmin;

  const DELETION_REASONS = [
    { value: 'too_expensive', label: 'Too expensive / pricing concerns' },
    { value: 'not_using', label: 'Not using it enough' },
    { value: 'missing_features', label: 'Missing features I need' },
    { value: 'found_alternative', label: 'Found a better alternative' },
    { value: 'privacy_concerns', label: 'Privacy or data concerns' },
    { value: 'too_complicated', label: 'Too complicated to use' },
    { value: 'temporary_break', label: 'Taking a temporary break' },
    { value: 'no_longer_needed', label: 'No longer needed (e.g. moved country)' },
    { value: 'technical_issues', label: 'Technical issues / bugs' },
    { value: 'poor_support', label: 'Poor customer support experience' },
    { value: 'other', label: 'Other reason' },
  ];

  const handleRequestAccountDeletion = async () => {
    if (!user || !profile) return;
    if (!deletionReason) {
      toast({ title: 'Reason required', description: 'Please select a reason for deleting your account.', variant: 'destructive' });
      return;
    }
    if (deletionReason === 'other' && !deletionReasonOther.trim()) {
      toast({ title: 'Reason required', description: 'Please describe your reason for deleting your account.', variant: 'destructive' });
      return;
    }
    if (deleteConfirmText !== 'DELETE') {
      toast({ title: 'Confirmation required', description: 'Please type DELETE to confirm.', variant: 'destructive' });
      return;
    }
    setIsDeletingAccount(true);
    try {
      const { data: storageData } = await supabase
        .from('user_profile')
        .select('storage_preference, google_drive_connected')
        .eq('user_id', user.id)
        .maybeSingle();

      const finalReason = deletionReason === 'other'
        ? `other: ${deletionReasonOther.trim()}`
        : deletionReason;

      // Archive user data
      const { error: archiveError } = await supabase
        .from('archived_users')
        .insert({
          original_user_id: user.id,
          email: profile.email,
          meaningful_user_id: (profile as any).meaningful_user_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          storage_preference: storageData?.storage_preference,
          google_drive_connected: storageData?.google_drive_connected ?? false,
          status: 'PENDING_DELETION',
          reason: finalReason,
        } as any);

      if (archiveError) throw archiveError;

      // Send account deletion notification email
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-user-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'account_deletion', userId: user.id, email: profile.email }),
      }).catch(err => console.error('Deletion email error:', err));

      toast({
        title: 'Account deletion requested',
        description: 'Your account will be deleted within 30 days. You have 30 days to download your documents.',
        duration: 8000,
      });
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      setDeletionReason('');
      setDeletionReasonOther('');
      // Sign out after requesting deletion
      setTimeout(() => signOut(), 2000);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to request account deletion.', variant: 'destructive' });
    } finally {
      setIsDeletingAccount(false);
    }
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

      <main className="profile-main">
        <div className="profile-title-section">
          <h1 className="profile-title">Profile</h1>
          <p className="profile-subtitle">Manage your personal information and account security.</p>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'preferences' ? 'profile-tab-active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <User className="h-4 w-4" />
            User Preferences
          </button>
          <button
            className={`profile-tab ${activeTab === 'settings' ? 'profile-tab-active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            className={`profile-tab ${activeTab === 'subscription' ? 'profile-tab-active' : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            <CreditCard className="h-4 w-4" />
            Subscription
          </button>
          {!isAdminRole && (
            <button
              className={`profile-tab ${activeTab === 'danger' ? 'profile-tab-active' : ''}`}
              onClick={() => setActiveTab('danger')}
              style={{ color: activeTab === 'danger' ? 'hsl(var(--destructive))' : undefined }}
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          )}
        </div>

        {/* ── User Preferences Tab ── */}
        {activeTab === 'preferences' && (
          <div className="profile-card">
            <form onSubmit={handleSubmit} className="profile-form">
              {/* Email (read-only) */}
              <div className="profile-field">
                <label className="profile-label">Email</label>
                <input type="email" value={profile?.email || ''} disabled className="profile-input" />
                <span className="profile-hint">Email cannot be changed.</span>
              </div>

              {/* Name */}
              <div className="profile-field-row">
                <div className="profile-field">
                  <label className="profile-label">First Name</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Enter your first name" disabled={isLoading} className="profile-input" />
                </div>
                <div className="profile-field">
                  <label className="profile-label">Last Name</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Enter your last name" disabled={isLoading} className="profile-input" />
                </div>
              </div>

              <div className="profile-section-divider" />
              <h3 className="profile-section-title">Tax Residency</h3>

              {/* Primary Tax Residency */}
              <div className="profile-field">
                <label className="profile-label">Primary Tax Residency *</label>
                <select value={primaryTaxResidency} onChange={e => setPrimaryTaxResidency(e.target.value)} disabled={isLoading} className="profile-select">
                  {ALL_COUNTRIES.map(country => (
                    <option key={country.code} value={country.code} disabled={!country.enabled}>
                      {country.nameNative !== country.nameEn ? `${country.nameEn} (${country.nameNative})` : country.nameEn}
                      {!country.enabled ? ' - Coming soon' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Other Tax Countries */}
              <div className="profile-field">
                <label className="profile-label">Other Tax-Relevant Countries</label>
                <span className="profile-hint">Select countries where you have additional tax obligations</span>
                <div className="profile-multiselect-container" ref={dropdownRef}>
                  <button type="button" className="profile-multiselect-trigger" onClick={() => setShowCountryDropdown(!showCountryDropdown)} disabled={isLoading}>
                    <span className={otherTaxCountries.length === 0 ? 'profile-multiselect-placeholder' : ''}>
                      {otherTaxCountries.length === 0 ? 'Select countries...' : `${otherTaxCountries.length} country(ies) selected`}
                    </span>
                    <ChevronDown className="profile-back-icon" />
                  </button>
                  {showCountryDropdown && (
                    <div className="profile-multiselect-dropdown">
                      {otherCountriesOptions.map(country => (
                        <div key={country.code} className={`profile-multiselect-option ${!country.enabled ? 'profile-multiselect-option-disabled' : ''}`} onClick={() => toggleOtherCountry(country.code, country.enabled)}>
                          <div className={`profile-multiselect-checkbox ${otherTaxCountries.includes(country.code) ? 'profile-multiselect-checkbox-checked' : ''}`}>
                            {otherTaxCountries.includes(country.code) && <Check className="w-3 h-3" />}
                          </div>
                          <span className="profile-multiselect-label">
                            {country.nameNative !== country.nameEn ? `${country.nameEn} (${country.nameNative})` : country.nameEn}
                          </span>
                          {!country.enabled && <span className="profile-multiselect-coming-soon">Coming soon</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {otherTaxCountries.length > 0 && (
                  <div className="profile-selected-countries">
                    {otherTaxCountries.map(code => {
                      const country = ALL_COUNTRIES.find(c => c.code === code);
                      return (
                        <span key={code} className="profile-country-chip">
                          {country?.nameEn || code}
                          <span className="profile-country-chip-remove" onClick={() => removeOtherCountry(code)}>
                            <X className="w-2.5 h-2.5" />
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* India Tax Year Type toggle */}
              {(primaryTaxResidency === 'INDIA' || otherTaxCountries.includes('INDIA')) && (
                <div className="profile-field">
                  <label className="profile-label">India Tax Year Calculation</label>
                  <span className="profile-hint">Do you wish to organise calculations as per Indian tax year or calendar year?</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: indiaTaxYearType === 'tax_year' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', fontWeight: indiaTaxYearType === 'tax_year' ? 600 : 400 }}>
                      Indian Tax Year (Apr–Mar)
                    </span>
                    <Switch
                      checked={indiaTaxYearType === 'calendar_year'}
                      onCheckedChange={(v) => setIndiaTaxYearType(v ? 'calendar_year' : 'tax_year')}
                      disabled={isLoading}
                    />
                    <span style={{ fontSize: '0.875rem', color: indiaTaxYearType === 'calendar_year' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', fontWeight: indiaTaxYearType === 'calendar_year' ? 600 : 400 }}>
                      Calendar Year (Jan–Dec)
                    </span>
                  </div>
                </div>
              )}

              <div className="profile-section-divider" />
              <h3 className="profile-section-title">Preferences</h3>

              {/* Storage */}
              <div className="profile-field">
                <label className="profile-label">Document Storage</label>
                <div className="profile-storage-options">
                  {/* Hide Platform Storage (Secure Vault) for Free users */}
                  {!isFreeUser && (
                    <div className={`profile-storage-option ${storagePreference === 'saas' ? 'profile-storage-option-selected' : ''}`} onClick={() => {
                      if (isLoading) return;
                      if (gdprConsentGiven) {
                        setStoragePreference('saas');
                      } else {
                        setShowGDPRConsent(true);
                      }
                    }}>
                      <Cloud className="w-5 h-5" />
                      <div>
                        <strong>Platform Storage</strong>
                        <span>{gdprConsentGiven ? '✓ GDPR consent given' : 'GDPR consent required'}</span>
                      </div>
                    </div>
                  )}
                  <div className={`profile-storage-option ${storagePreference === 'google_drive' ? 'profile-storage-option-selected' : ''}`} onClick={() => !isLoading && setStoragePreference('google_drive')}>
                    <HardDrive className="w-5 h-5" />
                    <div>
                      <strong>Google Drive</strong>
                      <span>{googleDriveConnected ? '✓ Connected' : 'Not connected'}</span>
                    </div>
                  </div>
                </div>
                {isFreeUser && (
                  <span className="profile-hint" style={{ color: 'hsl(var(--primary))' }}>
                    Secure Storage Vault is available for Freemium and above plans. <Link to="/pricing" style={{ textDecoration: 'underline' }}>Upgrade</Link>
                  </span>
                )}
                {storagePreference === 'google_drive' && !googleDriveConnected && (
                  <Button type="button" variant="default" size="sm" className="mt-2" onClick={() => setShowGoogleDriveSetup(true)}>
                    <HardDrive className="w-4 h-4 mr-1" /> Connect Google Drive
                  </Button>
                )}
                {googleDriveConnected && (
                  <Button type="button" variant="outline" size="sm" className="mt-2" disabled={isDisconnecting} onClick={async () => {
                    setIsDisconnecting(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) throw new Error('Not logged in');
                      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-auth`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                        body: JSON.stringify({ action: 'disconnect' }),
                      });
                      if (!response.ok) throw new Error('Disconnect failed');
                      await refreshStoragePreference();
                      toast({ title: 'Google Drive disconnected', description: 'Your existing files in Google Drive are preserved.' });
                    } catch (error: any) {
                      toast({ title: 'Error', description: error.message || 'Could not disconnect Google Drive.', variant: 'destructive' });
                    } finally {
                      setIsDisconnecting(false);
                    }
                  }}>
                    {isDisconnecting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Disconnecting...</> : <><Unlink className="w-4 h-4 mr-1" /> Disconnect Google Drive</>}
                  </Button>
                )}
                <span className="profile-hint">Choose where your tax documents are stored</span>
              </div>

              {/* Language */}
              <div className="profile-field">
                <label className="profile-label">Preferred Language</label>
                <select value={preferredLanguage} onChange={e => setPreferredLanguage(e.target.value)} disabled={isLoading} className="profile-select">
                  {availableLanguages.map(lang => (
                    <option key={lang.code} value={lang.code} disabled={!lang.enabled}>
                      {getLanguageLabel(lang)}{!lang.enabled ? ' - Coming soon' : ''}
                    </option>
                  ))}
                </select>
                <span className="profile-hint">Available languages depend on your selected tax countries</span>
              </div>

              <div className="profile-actions">
                <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</Button>
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} disabled={isLoading}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === 'settings' && (
          <SecuritySettings />
        )}

        {/* ── Subscription Tab ── */}
        {activeTab === 'subscription' && (
          <div className="profile-card">
            <div className="profile-form">
              {/* Current Plan Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CreditCard className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
                <div>
                  <h3 className="profile-section-title" style={{ marginBottom: 0 }}>Your Subscription</h3>
                  <p className="profile-hint">
                    Current plan: <strong>{subscription.subscription_plan}</strong> ({subscription.billing_cycle})
                    {subscription.is_legacy_user && ' • Legacy pricing'}
                  </p>
                </div>
              </div>

              {/* Upgrade CTA for non-Super Pro users */}
              {subscription.subscription_plan !== 'SUPER_PRO' && (
                <div style={{ background: 'hsl(var(--primary) / 0.06)', border: '1px solid hsl(var(--primary) / 0.2)', borderRadius: '0.5rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <p className="profile-hint" style={{ margin: 0 }}>
                    Unlock more features by upgrading your plan.
                  </p>
                  <Link to="/pricing">
                    <Button variant="default" size="sm">View Plans & Upgrade</Button>
                  </Link>
                </div>
              )}

              <div className="profile-section-divider" />

              {/* Downgrade Section */}
              {!subLoading && subscription.subscription_plan !== 'FREE' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ArrowDown className="h-5 w-5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                    <div>
                      <h3 className="profile-section-title" style={{ marginBottom: 0 }}>Downgrade Plan</h3>
                      <p className="profile-hint">
                        Request a downgrade to a lower tier.
                      </p>
                    </div>
                  </div>

                  {!showDowngrade ? (
                    <Button variant="outline" onClick={() => setShowDowngrade(true)} className="w-fit">
                      <ArrowDown className="h-4 w-4 mr-2" /> Request Downgrade
                    </Button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', background: 'hsl(var(--muted) / 0.3)' }}>
                      {/* Downgrade target */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label className="profile-label">Downgrade to:</label>
                        <select
                          className="profile-select"
                          value={downgradeTarget}
                          onChange={e => setDowngradeTarget(e.target.value)}
                          disabled={isDowngrading}
                        >
                          <option value="">— Select plan —</option>
                          {subscription.subscription_plan === 'SUPER_PRO' && <option value="PRO">Pro</option>}
                          {['SUPER_PRO', 'PRO'].includes(subscription.subscription_plan) && <option value="FREEMIUM">Freemium</option>}
                          <option value="FREE">Free</option>
                        </select>
                      </div>

                      {/* Downgrade reason */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label className="profile-label">Why do you wish to downgrade? <span style={{ color: 'hsl(var(--destructive))' }}>*</span></label>
                        <select
                          className="profile-select"
                          value={downgradeReason}
                          onChange={e => { setDowngradeReason(e.target.value); setDowngradeReasonOther(''); }}
                          disabled={isDowngrading}
                        >
                          <option value="">— Select a reason —</option>
                          <option value="too_expensive">Too expensive / pricing concerns</option>
                          <option value="not_using_features">Not using premium features enough</option>
                          <option value="temporary">Temporary — may upgrade again later</option>
                          <option value="found_alternative">Found a better alternative</option>
                          <option value="missing_features">Missing features I need</option>
                          <option value="simplifying">Simplifying my setup</option>
                          <option value="other">Other reason</option>
                        </select>
                        {downgradeReason === 'other' && (
                          <textarea
                            className="profile-input"
                            placeholder="Please describe your reason..."
                            value={downgradeReasonOther}
                            onChange={e => setDowngradeReasonOther(e.target.value)}
                            rows={3}
                            disabled={isDowngrading}
                            style={{ resize: 'vertical' }}
                          />
                        )}
                      </div>

                      {/* Important notices */}
                      <div style={{ background: 'hsl(var(--accent) / 0.3)', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.8rem' }}>
                        <ul style={{ listStyle: 'disc', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', color: 'hsl(var(--muted-foreground))' }}>
                          <li>Your current plan features will remain active until the end of your billing cycle.</li>
                          <li>Downgrade must be requested at least <strong>{config.downgrade_cutoff_days} days</strong> before billing cycle ends.</li>
                          {storagePreference === 'saas' && (
                            <li>You will have <strong>{config.vault_grace_period_days} days</strong> after downgrade to download your files from the Secure Vault.</li>
                          )}
                          {storagePreference === 'google_drive' && (
                            <li>Your Google Drive files will remain untouched — no action needed.</li>
                          )}
                          <li>You can upgrade again at any time to restore access.</li>
                        </ul>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <Button
                          variant="default"
                          disabled={!downgradeTarget || !downgradeReason || (downgradeReason === 'other' && !downgradeReasonOther.trim()) || isDowngrading}
                          onClick={async () => {
                            if (!user || !downgradeTarget || !downgradeReason) return;
                            setIsDowngrading(true);
                            try {
                              const { error } = await supabase
                                .from('user_subscriptions')
                                .update({
                                  subscription_plan: downgradeTarget,
                                  updated_at: new Date().toISOString(),
                                })
                                .eq('user_id', user.id);
                              if (error) throw error;

                              const reasonText = downgradeReason === 'other' ? `other: ${downgradeReasonOther.trim()}` : downgradeReason;
                              await supabase.from('subscription_history').insert({
                                user_id: user.id,
                                plan: downgradeTarget,
                                billing_cycle: subscription.billing_cycle,
                                change_type: 'DOWNGRADE',
                                price_at_purchase: 0,
                                is_legacy_applied: false,
                                payment_reference_id: `reason:${reasonText}`,
                              });

                              toast({
                                title: 'Plan downgraded',
                                description: `Your plan has been changed to ${downgradeTarget}. Current features remain active until billing cycle ends.`,
                                duration: 8000,
                              });
                              setShowDowngrade(false);
                              setDowngradeTarget('');
                              setDowngradeReason('');
                              setDowngradeReasonOther('');
                              setTimeout(() => window.location.reload(), 1500);
                            } catch (err: any) {
                              toast({ title: 'Error', description: err.message || 'Failed to downgrade.', variant: 'destructive' });
                            } finally {
                              setIsDowngrading(false);
                            }
                          }}
                        >
                          {isDowngrading ? 'Processing...' : 'Confirm Downgrade'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => { setShowDowngrade(false); setDowngradeTarget(''); setDowngradeReason(''); setDowngradeReasonOther(''); }}
                          disabled={isDowngrading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Free users see upgrade-only */}
              {subscription.subscription_plan === 'FREE' && (
                <p className="profile-hint">You are on the Free plan. Visit the <Link to="/pricing" style={{ textDecoration: 'underline', color: 'hsl(var(--primary))' }}>Pricing page</Link> to explore available plans.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Delete Account Tab ── */}
        {activeTab === 'danger' && !isAdminRole && (
          <div className="profile-card" style={{ border: '1px solid hsl(var(--destructive) / 0.3)' }}>
            <div className="profile-form">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle className="h-6 w-6" style={{ color: 'hsl(var(--destructive))' }} />
                <div>
                  <h3 className="profile-section-title" style={{ color: 'hsl(var(--destructive))', marginBottom: 0 }}>Delete Account</h3>
                  <p className="profile-hint">This action is irreversible. Please read carefully before proceeding.</p>
                </div>
              </div>

              <div style={{ background: 'hsl(var(--destructive) / 0.06)', border: '1px solid hsl(var(--destructive) / 0.2)', borderRadius: '0.5rem', padding: '1rem' }}>
                <ul className="profile-hint" style={{ listStyle: 'disc', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <li>Account deletion takes up to <strong>30 days</strong> to complete.</li>
                  <li>You have <strong>30 days</strong> to download your documents before they become inaccessible.</li>
                  <li>If you have chosen <strong>Google Drive</strong> as your storage, no action is needed — the link between this platform and your drive will be severed, and your files in Google Drive will remain untouched.</li>
                  <li>Documents stored in the <strong>platform's vault</strong> will no longer be accessible after 30 days.</li>
                  <li>All your personal information will be permanently deleted at the end of the 30-day period.</li>
                </ul>
              </div>

              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-fit"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Request Account Deletion
                </Button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', border: '1px solid hsl(var(--destructive) / 0.3)', borderRadius: '0.5rem', background: 'hsl(var(--destructive) / 0.04)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="profile-label" style={{ color: 'hsl(var(--destructive))' }}>
                      Why are you deleting your account? <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
                    </label>
                    <select
                      className="profile-select"
                      value={deletionReason}
                      onChange={e => { setDeletionReason(e.target.value); setDeletionReasonOther(''); }}
                      style={{ borderColor: 'hsl(var(--destructive) / 0.4)' }}
                      disabled={isDeletingAccount}
                    >
                      <option value="">— Select a reason —</option>
                      {DELETION_REASONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    {deletionReason === 'other' && (
                      <textarea
                        className="profile-input"
                        placeholder="Please describe your reason..."
                        value={deletionReasonOther}
                        onChange={e => setDeletionReasonOther(e.target.value)}
                        rows={3}
                        disabled={isDeletingAccount}
                        style={{ borderColor: 'hsl(var(--destructive) / 0.5)', resize: 'vertical' }}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p className="profile-label" style={{ color: 'hsl(var(--destructive))' }}>
                      Type <strong>DELETE</strong> to confirm you understand this action cannot be undone:
                    </p>
                    <input
                      type="text"
                      className="profile-input"
                      placeholder="Type DELETE here"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      style={{ borderColor: 'hsl(var(--destructive) / 0.5)' }}
                      disabled={isDeletingAccount}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Button
                      variant="destructive"
                      disabled={!deletionReason || (deletionReason === 'other' && !deletionReasonOther.trim()) || deleteConfirmText !== 'DELETE' || isDeletingAccount}
                      onClick={handleRequestAccountDeletion}
                    >
                      {isDeletingAccount ? 'Processing...' : 'Confirm Deletion'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeletionReason(''); setDeletionReasonOther(''); }}
                      disabled={isDeletingAccount}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Google Drive Modal */}
      {showGoogleDriveSetup && (
        <GoogleDriveSetupModal
          isDE={false}
          pendingOAuthCode={pendingOAuthCode}
          onComplete={async (folderId) => {
            try {
              const { error } = await supabase.from('user_profile').upsert({ user_id: user!.id, google_drive_folder_id: folderId, google_drive_connected: true }, { onConflict: 'user_id' });
              if (error) throw error;
              await refreshStoragePreference();
              setPendingOAuthCode(null);
              setShowGoogleDriveSetup(false);
              toast({ title: 'Google Drive connected', description: 'Your Google Drive is now set up for document storage.' });
            } catch (error: any) {
              toast({ title: 'Error', description: error.message || 'Could not save connection.', variant: 'destructive' });
            }
          }}
          onCancel={() => { setPendingOAuthCode(null); setShowGoogleDriveSetup(false); }}
          userEmail={profile?.email}
        />
      )}

      {/* GDPR Consent Modal */}
      {showGDPRConsent && (
        <GDPRConsentModal
          isDE={preferredLanguage === 'DE'}
          onAccept={async () => {
            try {
              await setGDPRConsent(true);
              await setStoragePreference('saas');
              setShowGDPRConsent(false);
              toast({ title: 'GDPR consent accepted', description: 'Platform Storage is now your storage preference.' });
            } catch (error: any) {
              toast({ title: 'Error', description: error.message || 'Failed to update consent.', variant: 'destructive' });
            }
          }}
          onDecline={() => setShowGDPRConsent(false)}
        />
      )}
    </div>
  );
}
