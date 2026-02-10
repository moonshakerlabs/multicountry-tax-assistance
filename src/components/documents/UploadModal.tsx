import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useStoragePreference } from '@/hooks/useStoragePreference';
import { supabase } from '@/integrations/supabase/client';
import { X, Upload, Plus, FileUp, HardDrive } from 'lucide-react';
import { getMainCategoriesForCountry, getSubCategoriesForCountry, getCategoryLabel } from '@/lib/categories';
import { ALL_COUNTRIES } from '@/lib/countryLanguageData';
import StoragePreferenceModal from './StoragePreferenceModal';
import GDPRConsentModal from './GDPRConsentModal';
import GoogleDriveSetupModal from './GoogleDriveSetupModal';
import './UploadModal.css';

interface CustomCategory {
  id: string;
  country: string;
  main_category: string;
  sub_category: string;
}

interface UserProfile {
  primary_tax_residency: string;
  other_tax_countries: string[];
  preferred_language: string;
}

interface UploadModalProps {
  userProfile: UserProfile | null;
  onClose: () => void;
  onUploadComplete: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const TAX_YEARS = Array.from({ length: 10 }, (_, i) => (CURRENT_YEAR - i).toString());

type ModalFlow = 'none' | 'storage_choice' | 'gdpr_consent' | 'google_drive_redirect' | 'upload';

export default function UploadModal({ userProfile, onClose, onUploadComplete }: UploadModalProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const {
    storagePreference,
    gdprConsentGiven,
    googleDriveConnected,
    needsStorageChoice,
    loading: storageLoading,
    setStoragePreference,
    setGDPRConsent,
    setGoogleDriveConnection,
    refresh: refreshStorage,
  } = useStoragePreference();
  
  const [modalFlow, setModalFlow] = useState<ModalFlow>('none');
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  
  // Form state
  const [country, setCountry] = useState(userProfile?.primary_tax_residency || 'GERMANY');
  const [taxYear, setTaxYear] = useState(CURRENT_YEAR.toString());
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [customSubCategory, setCustomSubCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const isDE = userProfile?.preferred_language === 'DE';

  // Refresh storage preference data when modal opens
  useEffect(() => {
    refreshStorage();
  }, []);

  // Determine which flow to show based on storage preference
  useEffect(() => {
    if (storageLoading) return;

    if (needsStorageChoice) {
      setModalFlow('storage_choice');
    } else if (storagePreference === 'saas' && !gdprConsentGiven) {
      setModalFlow('gdpr_consent');
    } else if (storagePreference === 'google_drive' && !googleDriveConnected) {
      setModalFlow('google_drive_redirect');
    } else {
      setModalFlow('upload');
    }
  }, [storageLoading, needsStorageChoice, storagePreference, gdprConsentGiven, googleDriveConnected]);

  // Handle Google Drive OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('gdrive_oauth_state');

    if (code && state && storedState === state) {
      // Clean URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      
      // Trigger callback
      if ((window as any).__handleGDriveCallback) {
        (window as any).__handleGDriveCallback(code);
      }
    }
  }, []);

  // Get available countries from user profile
  const availableCountries = [
    userProfile?.primary_tax_residency || 'GERMANY',
    ...(userProfile?.other_tax_countries || []),
  ].filter((c, i, arr) => arr.indexOf(c) === i);

  // Get main categories from local data files
  const mainCategories = getMainCategoriesForCountry(country);
  
  // Get sub categories from local data + custom categories
  const localSubCategories = mainCategory ? getSubCategoriesForCountry(country, mainCategory) : [];
  const customSubCategories = customCategories
    .filter(c => c.main_category === mainCategory)
    .map(c => ({
      code: c.sub_category,
      labelEn: c.sub_category.replace(/_/g, ' '),
      isCustom: true,
    }));
  
  const subCategories = [
    ...localSubCategories.map(c => ({ ...c, isCustom: false })),
    ...customSubCategories,
  ];

  // Fetch custom categories
  useEffect(() => {
    async function fetchCustomCategories() {
      if (user) {
        const { data: customCats } = await supabase
          .from('custom_categories')
          .select('*')
          .eq('user_id', user.id)
          .eq('country', country);
        
        setCustomCategories(customCats || []);
      }
    }
    
    fetchCustomCategories();
  }, [country, user]);

  // Storage preference handlers
  const handleSelectSaaS = async () => {
    try {
      await setStoragePreference('saas');
      setModalFlow('gdpr_consent');
    } catch (error) {
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE ? 'Einstellung konnte nicht gespeichert werden.' : 'Could not save preference.',
        variant: 'destructive',
      });
    }
  };

  const handleSelectGoogleDrive = async () => {
    try {
      await setStoragePreference('google_drive');
      setModalFlow('google_drive_redirect');
    } catch (error) {
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE ? 'Einstellung konnte nicht gespeichert werden.' : 'Could not save preference.',
        variant: 'destructive',
      });
    }
  };

  const handleGDPRAccept = async () => {
    try {
      await setGDPRConsent(true);
      setModalFlow('upload');
      toast({
        title: isDE ? 'Einwilligung erteilt' : 'Consent given',
        description: isDE ? 'Vielen Dank für Ihre Einwilligung.' : 'Thank you for your consent.',
      });
    } catch (error) {
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE ? 'Einwilligung konnte nicht gespeichert werden.' : 'Could not save consent.',
        variant: 'destructive',
      });
    }
  };

  const handleGDPRDecline = () => {
    onClose();
    toast({
      title: isDE ? 'Einwilligung abgelehnt' : 'Consent declined',
      description: isDE 
        ? 'Ohne GDPR-Einwilligung können wir Ihre Dokumente nicht speichern.' 
        : 'Without GDPR consent, we cannot store your documents.',
    });
  };

  const handleGoogleDriveComplete = async (folderId: string) => {
    try {
      await setGoogleDriveConnection(folderId);
      await refreshStorage();
      setModalFlow('upload');
      toast({
        title: isDE ? 'Google Drive verbunden' : 'Google Drive connected',
        description: isDE ? 'Ihr Google Drive ist jetzt eingerichtet.' : 'Your Google Drive is now set up.',
      });
    } catch (error) {
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE ? 'Verbindung konnte nicht gespeichert werden.' : 'Could not save connection.',
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: isDE ? 'Ungültiger Dateityp' : 'Invalid file type',
          description: isDE 
            ? 'Bitte laden Sie nur PDF, Word oder Bilddateien hoch.'
            : 'Please upload PDF, Word or image files only.',
          variant: 'destructive',
        });
        return;
      }
      
      if (selectedFile.size > 52428800) {
        toast({
          title: isDE ? 'Datei zu groß' : 'File too large',
          description: isDE 
            ? 'Die maximale Dateigröße beträgt 50 MB.'
            : 'Maximum file size is 50 MB.',
          variant: 'destructive',
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleAddCustomCategory = async () => {
    if (!customSubCategory.trim() || !mainCategory || !user) return;
    
    try {
      const { error } = await supabase
        .from('custom_categories')
        .insert({
          user_id: user.id,
          country,
          main_category: mainCategory,
          sub_category: customSubCategory.trim().replace(/\s+/g, '_'),
        });
      
      if (error) throw error;
      
      const { data: customCats } = await supabase
        .from('custom_categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('country', country);
      
      setCustomCategories(customCats || []);
      setSubCategory(customSubCategory.trim().replace(/\s+/g, '_'));
      setCustomSubCategory('');
      setShowCustomInput(false);
      
      toast({
        title: isDE ? 'Kategorie hinzugefügt' : 'Category added',
        description: isDE 
          ? 'Ihre benutzerdefinierte Kategorie wurde erstellt.'
          : 'Your custom category has been created.',
      });
    } catch (error) {
      console.error('Error adding custom category:', error);
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE 
          ? 'Kategorie konnte nicht hinzugefügt werden.'
          : 'Could not add category.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !user || !mainCategory || !subCategory) {
      toast({
        title: isDE ? 'Fehlende Felder' : 'Missing fields',
        description: isDE 
          ? 'Bitte füllen Sie alle erforderlichen Felder aus.'
          : 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      if (storagePreference === 'google_drive') {
        // Upload to Google Drive via edge function
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not logged in');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('country', country);
        formData.append('year', taxYear);
        formData.append('category', subCategory);
        formData.append('original_filename', file.name);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-upload`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
          }
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || result.error || 'Upload failed');
        }

        // Also store document record in our DB for tracking
        const documentId = crypto.randomUUID();
        await supabase.from('documents').insert({
          id: documentId,
          user_id: user.id,
          country,
          tax_year: taxYear,
          main_category: mainCategory,
          sub_category: subCategory,
          file_name: result.file_name || file.name,
          file_path: `gdrive://${result.file_id}`,
        });

        toast({
          title: isDE ? 'Erfolgreich hochgeladen' : 'Upload successful',
          description: isDE 
            ? `Dokument in Google Drive gespeichert: ${result.drive_folder_path}`
            : `Document saved to Google Drive: ${result.drive_folder_path}`,
        });
        
        onUploadComplete();
        return;
      }

      // SaaS storage upload
      const documentId = crypto.randomUUID();
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${documentId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          id: documentId,
          user_id: user.id,
          country,
          tax_year: taxYear,
          main_category: mainCategory,
          sub_category: subCategory,
          file_name: file.name,
          file_path: filePath,
        });
      
      if (dbError) {
        await supabase.storage.from('user-documents').remove([filePath]);
        throw dbError;
      }
      
      toast({
        title: isDE ? 'Erfolgreich hochgeladen' : 'Upload successful',
        description: isDE 
          ? 'Ihr Dokument wurde gespeichert.'
          : 'Your document has been saved.',
      });
      
      onUploadComplete();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: isDE ? 'Hochladen fehlgeschlagen' : 'Upload failed',
        description: error.message || (isDE 
          ? 'Das Dokument konnte nicht hochgeladen werden.'
          : 'Could not upload document. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getCountryLabel = (code: string) => {
    const countryData = ALL_COUNTRIES.find(c => c.code === code);
    if (countryData) {
      return isDE ? countryData.nameNative : countryData.nameEn;
    }
    const labels: Record<string, { en: string; de: string }> = {
      'GERMANY': { en: 'Germany', de: 'Deutschland' },
      'INDIA': { en: 'India', de: 'Indien' },
      'UAE': { en: 'United Arab Emirates', de: 'Vereinigte Arabische Emirate' },
    };
    return labels[code]?.[isDE ? 'de' : 'en'] || code;
  };

  // Loading state
  if (storageLoading) {
    return (
      <div className="upload-modal-overlay">
        <div className="upload-modal">
          <div className="upload-modal-loading">
            <p>{isDE ? 'Wird geladen...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Storage preference selection flow
  if (modalFlow === 'storage_choice') {
    return (
      <StoragePreferenceModal
        isDE={isDE}
        onSelectSaaS={handleSelectSaaS}
        onSelectGoogleDrive={handleSelectGoogleDrive}
        onClose={onClose}
      />
    );
  }

  // GDPR consent flow
  if (modalFlow === 'gdpr_consent') {
    return (
      <GDPRConsentModal
        isDE={isDE}
        onAccept={handleGDPRAccept}
        onDecline={handleGDPRDecline}
      />
    );
  }

  // Google Drive not connected — redirect to Profile
  if (modalFlow === 'google_drive_redirect') {
    return (
      <div className="upload-modal-overlay" onClick={onClose}>
        <div className="upload-modal" onClick={e => e.stopPropagation()}>
          <div className="upload-modal-header">
            <h2 className="upload-modal-title">
              {isDE ? 'Google Drive nicht verbunden' : 'Google Drive Not Connected'}
            </h2>
            <button className="upload-modal-close" onClick={onClose}>
              <X className="upload-modal-close-icon" />
            </button>
          </div>
          <div className="upload-modal-form" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-60" />
            <p style={{ marginBottom: '1.5rem', color: 'hsl(var(--muted-foreground))' }}>
              {isDE
                ? 'Bitte verbinden Sie zuerst Ihr Google Drive in den Profileinstellungen, bevor Sie Dokumente hochladen.'
                : 'Please connect your Google Drive in Profile settings before uploading documents.'}
            </p>
            <div className="upload-modal-actions" style={{ justifyContent: 'center' }}>
              <Button variant="outline" onClick={onClose}>
                {isDE ? 'Abbrechen' : 'Cancel'}
              </Button>
              <Button asChild>
                <a href="/profile">{isDE ? 'Zu den Profileinstellungen' : 'Go to Profile Settings'}</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular upload form
  return (
    <div className="upload-modal-overlay" onClick={onClose}>
      <div className="upload-modal" onClick={e => e.stopPropagation()}>
        <div className="upload-modal-header">
          <h2 className="upload-modal-title">
            {isDE ? 'Dokument hochladen' : 'Upload Document'}
          </h2>
          <button className="upload-modal-close" onClick={onClose}>
            <X className="upload-modal-close-icon" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="upload-modal-form">
          {/* Storage indicator */}
          <div className="upload-storage-indicator">
            <span className="upload-storage-label">
              {isDE ? 'Speicherort:' : 'Storage:'}
            </span>
            <span className="upload-storage-value">
              {storagePreference === 'saas' 
                ? (isDE ? 'Plattform-Speicher' : 'Platform Storage')
                : (isDE ? 'Google Drive' : 'Google Drive')}
            </span>
          </div>

          {/* File Upload */}
          <div className="upload-field">
            <Label>{isDE ? 'Datei *' : 'File *'}</Label>
            <div className="upload-dropzone">
              <input
                type="file"
                id="file-upload"
                className="upload-file-input"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
              <label htmlFor="file-upload" className="upload-dropzone-label">
                {file ? (
                  <>
                    <FileUp className="upload-dropzone-icon upload-dropzone-icon-success" />
                    <span className="upload-dropzone-text">{file.name}</span>
                    <span className="upload-dropzone-hint">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="upload-dropzone-icon" />
                    <span className="upload-dropzone-text">
                      {isDE ? 'Datei auswählen oder hierher ziehen' : 'Choose a file or drag it here'}
                    </span>
                    <span className="upload-dropzone-hint">
                      PDF, Word, {isDE ? 'oder Bilder' : 'or images'} ({isDE ? 'max' : 'max'}. 50 MB)
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Country Selection */}
          <div className="upload-field">
            <Label>{isDE ? 'Land *' : 'Country *'}</Label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setMainCategory('');
                setSubCategory('');
              }}
              className="upload-select"
            >
              {availableCountries.map(c => (
                <option key={c} value={c}>{getCountryLabel(c)}</option>
              ))}
            </select>
          </div>

          {/* Tax Year */}
          <div className="upload-field">
            <Label>{isDE ? 'Steuerjahr *' : 'Tax Year *'}</Label>
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="upload-select"
            >
              {TAX_YEARS.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Main Category */}
          <div className="upload-field">
            <Label>{isDE ? 'Hauptkategorie *' : 'Main Category *'}</Label>
            <select
              value={mainCategory}
              onChange={(e) => {
                setMainCategory(e.target.value);
                setSubCategory('');
              }}
              className="upload-select"
            >
              <option value="">{isDE ? 'Kategorie auswählen' : 'Select category'}</option>
              {mainCategories.map(cat => (
                <option key={cat.code} value={cat.code}>
                  {getCategoryLabel(cat, isDE)}
                </option>
              ))}
            </select>
          </div>

          {mainCategory && (
            <div className="upload-field">
              <Label>{isDE ? 'Unterkategorie *' : 'Sub Category *'}</Label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="upload-select"
              >
                <option value="">{isDE ? 'Unterkategorie auswählen' : 'Select sub category'}</option>
                {subCategories.map(cat => (
                  <option key={cat.code} value={cat.code}>
                    {getCategoryLabel(cat, isDE)} {cat.isCustom ? (isDE ? '(Benutzerdefiniert)' : '(Custom)') : ''}
                  </option>
                ))}
              </select>
              
              {!showCustomInput ? (
                <button 
                  type="button" 
                  className="upload-add-custom"
                  onClick={() => setShowCustomInput(true)}
                >
                  <Plus className="upload-add-custom-icon" />
                  {isDE ? 'Eigene Unterkategorie hinzufügen' : 'Add custom sub category'}
                </button>
              ) : (
                <div className="upload-custom-input">
                  <Input
                    value={customSubCategory}
                    onChange={(e) => setCustomSubCategory(e.target.value)}
                    placeholder={isDE ? 'Name der Unterkategorie' : 'Sub category name'}
                  />
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={handleAddCustomCategory}
                    disabled={!customSubCategory.trim()}
                  >
                    {isDE ? 'Hinzufügen' : 'Add'}
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomSubCategory('');
                    }}
                  >
                    {isDE ? 'Abbrechen' : 'Cancel'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="upload-modal-actions">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
              {isDE ? 'Abbrechen' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isUploading || !file || !mainCategory || !subCategory}>
              {isUploading 
                ? (isDE ? 'Wird hochgeladen...' : 'Uploading...') 
                : (isDE ? 'Hochladen' : 'Upload')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
