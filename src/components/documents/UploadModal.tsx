import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useStoragePreference } from '@/hooks/useStoragePreference';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { X, Upload, Plus, FileUp, HardDrive, Trash2, Lock } from 'lucide-react';
import { getMainCategoriesForCountry, getSubCategoriesForCountry, getCategoryLabelBilingual } from '@/lib/categories';
import { ALL_COUNTRIES } from '@/lib/countryLanguageData';
import { getFiscalYearOptions } from '@/lib/fiscalYearData';
import StoragePreferenceModal from './StoragePreferenceModal';
import GDPRConsentModal from './GDPRConsentModal';

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

interface FileEntry {
  file: File;
  customName: string;
  mainCategory: string;
  subCategory: string;
}

// Tax years are now dynamically generated per country using fiscal year data

type ModalFlow = 'none' | 'storage_choice' | 'gdpr_consent' | 'google_drive_redirect' | 'upload';
type CategoryMode = 'single' | 'multiple';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 52428800; // 50 MB

export default function UploadModal({ userProfile, onClose, onUploadComplete }: UploadModalProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const {
    storagePreference,
    gdprConsentGiven,
    googleDriveConnected,
    needsStorageChoice,
    loading: storageLoading,
    setStoragePreference,
    setGDPRConsent,
    refresh: refreshStorage,
  } = useStoragePreference();
  
  const [modalFlow, setModalFlow] = useState<ModalFlow>('none');
  const [isUploading, setIsUploading] = useState(false);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [shareEnabled, setShareEnabled] = useState(true);
  const [categoryMode, setCategoryMode] = useState<CategoryMode>('single');
  
  // Form state
  const [country, setCountry] = useState(userProfile?.primary_tax_residency || 'GERMANY');
  const [taxYear, setTaxYear] = useState('');
  
  // Dynamic fiscal year options based on country
  const fiscalYearOptions = getFiscalYearOptions(country);
  
  // Set default tax year when country changes
  useEffect(() => {
    const options = getFiscalYearOptions(country);
    if (options.length > 0) {
      setTaxYear(options[0].value);
    }
  }, [country]);
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [customSubCategory, setCustomSubCategory] = useState('');
  const [showCustomSubInput, setShowCustomSubInput] = useState(false);
  const [customMainCategory, setCustomMainCategory] = useState('');
  const [showCustomMainInput, setShowCustomMainInput] = useState(false);
  
  const profileLang = userProfile?.preferred_language || 'EN';
  const isDE = profileLang === 'DE';

  // Subscription-based access for custom categories
  const planKey = subscription.subscription_plan || 'FREE';
  const canAddCustom = planKey !== 'FREE'; // Freemium and above can add custom categories

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

  // Get available countries from user profile
  const availableCountries = [
    userProfile?.primary_tax_residency || 'GERMANY',
    ...(userProfile?.other_tax_countries || []),
  ].filter((c, i, arr) => arr.indexOf(c) === i);

  // Get main categories from local data files + custom main categories
  const systemMainCategories = getMainCategoriesForCountry(country);
  const customMainCats = customCategories
    .filter(c => c.main_category && !systemMainCategories.some(s => s.code === c.main_category))
    .reduce((acc, c) => {
      if (!acc.find(a => a.code === c.main_category)) {
        acc.push({
          code: c.main_category,
          labelEn: c.main_category.replace(/_/g, ' '),
          isCustom: true,
        });
      }
      return acc;
    }, [] as Array<{ code: string; labelEn: string; isCustom: boolean }>);

  const allMainCategories = [
    ...systemMainCategories.map(c => ({ ...c, isCustom: false })),
    ...customMainCats,
  ];
  
  // Get sub categories from local data + custom categories
  const getSubCatsForMain = (mainCat: string) => {
    const localSubs = mainCat ? getSubCategoriesForCountry(country, mainCat) : [];
    const customSubs = customCategories
      .filter(c => c.main_category === mainCat)
      .map(c => ({
        code: c.sub_category,
        labelEn: c.sub_category.replace(/_/g, ' '),
        isCustom: true,
      }));
    return [
      ...localSubs.map(c => ({ ...c, isCustom: false })),
      ...customSubs,
    ];
  };

  const subCategories = getSubCatsForMain(mainCategory);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newEntries: FileEntry[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const f = selectedFiles[i];
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast({
          title: isDE ? 'Ungültiger Dateityp' : 'Invalid file type',
          description: `${f.name}: ${isDE ? 'Nur PDF, Word oder Bilddateien.' : 'Only PDF, Word or image files.'}`,
          variant: 'destructive',
        });
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast({
          title: isDE ? 'Datei zu groß' : 'File too large',
          description: `${f.name}: ${isDE ? 'Max. 50 MB.' : 'Max 50 MB.'}`,
          variant: 'destructive',
        });
        continue;
      }
      newEntries.push({ file: f, customName: '', mainCategory: '', subCategory: '' });
    }
    setFileEntries(prev => [...prev, ...newEntries]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFileEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateCustomName = (index: number, name: string) => {
    setFileEntries(prev => prev.map((entry, i) => i === index ? { ...entry, customName: name } : entry));
  };

  const updateFileMainCategory = (index: number, value: string) => {
    setFileEntries(prev => prev.map((entry, i) => i === index ? { ...entry, mainCategory: value, subCategory: '' } : entry));
  };

  const updateFileSubCategory = (index: number, value: string) => {
    setFileEntries(prev => prev.map((entry, i) => i === index ? { ...entry, subCategory: value } : entry));
  };

  const getEffectiveFileName = (entry: FileEntry): string => {
    if (entry.customName.trim()) {
      const ext = entry.file.name.split('.').pop();
      const baseName = entry.customName.trim();
      if (baseName.toLowerCase().endsWith(`.${ext?.toLowerCase()}`)) {
        return baseName;
      }
      return `${baseName}.${ext}`;
    }
    return entry.file.name;
  };

  // Helper to get bilingual label for a category item
  const getBilingualLabel = (item: { code: string; labelEn: string; labelLocal?: string; isCustom?: boolean }) => {
    if (item.isCustom) {
      return `${item.labelEn} ${isDE ? '(Benutzerdefiniert)' : '(Custom)'}`;
    }
    return getCategoryLabelBilingual(item, profileLang, country);
  };

  const handleAddCustomMainCategory = async () => {
    if (!customMainCategory.trim() || !user || !canAddCustom) return;
    
    const mainCatCode = customMainCategory.trim().replace(/\s+/g, '_').toUpperCase();
    
    try {
      // Insert a placeholder custom category with the new main category
      const { error } = await supabase
        .from('custom_categories')
        .insert({
          user_id: user.id,
          country,
          main_category: mainCatCode,
          sub_category: 'GENERAL',
        });
      
      if (error) throw error;
      
      // Refresh custom categories
      const { data: customCats } = await supabase
        .from('custom_categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('country', country);
      
      setCustomCategories(customCats || []);
      setMainCategory(mainCatCode);
      setSubCategory('');
      setCustomMainCategory('');
      setShowCustomMainInput(false);
      
      toast({
        title: isDE ? 'Kategorie hinzugefügt' : 'Category added',
        description: isDE 
          ? 'Ihre benutzerdefinierte Hauptkategorie wurde erstellt.'
          : 'Your custom main category has been created.',
      });
    } catch (error) {
      console.error('Error adding custom main category:', error);
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE 
          ? 'Kategorie konnte nicht hinzugefügt werden.'
          : 'Could not add category.',
        variant: 'destructive',
      });
    }
  };

  const handleAddCustomSubCategory = async () => {
    if (!customSubCategory.trim() || !mainCategory || !user || !canAddCustom) return;
    
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
      setShowCustomSubInput(false);
      
      toast({
        title: isDE ? 'Kategorie hinzugefügt' : 'Category added',
        description: isDE 
          ? 'Ihre benutzerdefinierte Unterkategorie wurde erstellt.'
          : 'Your custom sub category has been created.',
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

  // Check if all files have valid categories based on mode
  const allCategoriesValid = () => {
    if (categoryMode === 'single') {
      return !!mainCategory && !!subCategory;
    }
    return fileEntries.every(entry => !!entry.mainCategory && !!entry.subCategory);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (fileEntries.length === 0 || !user || !allCategoriesValid()) {
      toast({
        title: isDE ? 'Fehlende Felder' : 'Missing fields',
        description: isDE 
          ? 'Bitte füllen Sie alle erforderlichen Felder aus und wählen Sie mindestens eine Datei.'
          : 'Please fill in all required fields and select at least one file.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (const entry of fileEntries) {
        const effectiveName = getEffectiveFileName(entry);
        const fileMainCat = categoryMode === 'multiple' ? entry.mainCategory : mainCategory;
        const fileSubCat = categoryMode === 'multiple' ? entry.subCategory : subCategory;

        try {
          if (storagePreference === 'google_drive') {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not logged in');

            const formData = new FormData();
            formData.append('file', entry.file);
            formData.append('country', country);
            formData.append('year', taxYear);
            formData.append('category', fileSubCat);
            formData.append('original_filename', effectiveName);

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

            const documentId = crypto.randomUUID();
            await supabase.from('documents').insert({
              id: documentId,
              user_id: user.id,
              country,
              tax_year: taxYear,
              main_category: fileMainCat,
              sub_category: fileSubCat,
              file_name: result.file_name || effectiveName,
              file_path: `gdrive://${result.file_id}`,
              share_enabled: shareEnabled,
            });
          } else {
            // SaaS storage upload
            const documentId = crypto.randomUUID();
            const fileExt = entry.file.name.split('.').pop();
            const filePath = `${user.id}/${documentId}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('user-documents')
              .upload(filePath, entry.file);
            
            if (uploadError) throw uploadError;
            
            const { error: dbError } = await supabase
              .from('documents')
              .insert({
                id: documentId,
                user_id: user.id,
                country,
                tax_year: taxYear,
                main_category: fileMainCat,
                sub_category: fileSubCat,
                file_name: effectiveName,
                file_path: filePath,
                share_enabled: shareEnabled,
              });
            
            if (dbError) {
              await supabase.storage.from('user-documents').remove([filePath]);
              throw dbError;
            }
          }
          successCount++;
        } catch (fileError: any) {
          console.error(`Upload error for ${effectiveName}:`, fileError);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: isDE ? 'Erfolgreich hochgeladen' : 'Upload successful',
          description: failCount > 0
            ? (isDE 
              ? `${successCount} Dokument(e) hochgeladen, ${failCount} fehlgeschlagen.`
              : `${successCount} document(s) uploaded, ${failCount} failed.`)
            : (isDE 
              ? `${successCount} Dokument(e) erfolgreich hochgeladen.`
              : `${successCount} document(s) uploaded successfully.`),
        });
        onUploadComplete();
      } else {
        toast({
          title: isDE ? 'Hochladen fehlgeschlagen' : 'Upload failed',
          description: isDE 
            ? 'Keine Dokumente konnten hochgeladen werden.'
            : 'No documents could be uploaded.',
          variant: 'destructive',
        });
      }
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

  // Render "Add custom" button or locked indicator
  const renderAddCustomButton = (
    label: string,
    showInput: boolean,
    setShowInput: (v: boolean) => void
  ) => {
    if (!canAddCustom) {
      // Show existing custom categories but don't allow adding new ones
      return (
        <span className="upload-custom-locked">
          <Lock className="upload-add-custom-icon" />
          {isDE ? 'Benutzerdefinierte Kategorien (ab Freemium)' : 'Custom categories (Freemium+)'}
        </span>
      );
    }
    return (
      <button 
        type="button" 
        className="upload-add-custom"
        onClick={() => setShowInput(true)}
      >
        <Plus className="upload-add-custom-icon" />
        {label}
      </button>
    );
  };

  // Render per-file category dropdowns
  const renderPerFileCategoryDropdowns = (entry: FileEntry, index: number) => {
    const fileSubCats = getSubCatsForMain(entry.mainCategory);
    return (
      <div className="upload-file-entry-categories">
        <select
          value={entry.mainCategory}
          onChange={(e) => updateFileMainCategory(index, e.target.value)}
          className="upload-select upload-select-compact"
        >
          <option value="">{isDE ? 'Hauptkategorie' : 'Main Category'}</option>
          {allMainCategories.map(cat => (
            <option key={cat.code} value={cat.code}>
              {getBilingualLabel(cat)}
            </option>
          ))}
        </select>
        {entry.mainCategory && (
          <select
            value={entry.subCategory}
            onChange={(e) => updateFileSubCategory(index, e.target.value)}
            className="upload-select upload-select-compact"
          >
            <option value="">{isDE ? 'Unterkategorie' : 'Sub Category'}</option>
            {fileSubCats.map(cat => (
              <option key={cat.code} value={cat.code}>
                {getBilingualLabel(cat)}
              </option>
            ))}
          </select>
        )}
      </div>
    );
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

  // Regular upload form — Order: Storage → Country → Tax Year → Files → Categories
  return (
    <div className="upload-modal-overlay" onClick={onClose}>
      <div className="upload-modal" onClick={e => e.stopPropagation()}>
        <div className="upload-modal-header">
          <h2 className="upload-modal-title">
            {isDE ? 'Dokumente hochladen' : 'Upload Documents'}
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

          {/* 1. Country Selection */}
          <div className="upload-field">
            <Label>{isDE ? 'Land *' : 'Country *'}</Label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setMainCategory('');
                setSubCategory('');
                setFileEntries(prev => prev.map(entry => ({ ...entry, mainCategory: '', subCategory: '' })));
              }}
              className="upload-select"
            >
              {availableCountries.map(c => (
                <option key={c} value={c}>{getCountryLabel(c)}</option>
              ))}
            </select>
          </div>

          {/* 2. Tax Year (Fiscal Year) */}
          <div className="upload-field">
            <Label>{isDE ? 'Steuerjahr *' : 'Tax Year *'}</Label>
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="upload-select"
            >
              {fiscalYearOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 3. File Upload */}
          <div className="upload-field">
            <Label>{isDE ? 'Dateien *' : 'Files *'}</Label>
            <div className="upload-dropzone">
              <input
                type="file"
                id="file-upload"
                className="upload-file-input"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                multiple
              />
              <label htmlFor="file-upload" className="upload-dropzone-label">
                {fileEntries.length > 0 ? (
                  <>
                    <FileUp className="upload-dropzone-icon upload-dropzone-icon-success" />
                    <span className="upload-dropzone-text">
                      {fileEntries.length} {isDE ? 'Datei(en) ausgewählt' : 'file(s) selected'}
                    </span>
                    <span className="upload-dropzone-hint">
                      {isDE ? 'Klicken, um weitere hinzuzufügen' : 'Click to add more'}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="upload-dropzone-icon" />
                    <span className="upload-dropzone-text">
                      {isDE ? 'Dateien auswählen oder hierher ziehen' : 'Choose files or drag them here'}
                    </span>
                    <span className="upload-dropzone-hint">
                      PDF, Word, {isDE ? 'oder Bilder' : 'or images'} ({isDE ? 'max' : 'max'}. 50 MB)
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Category Mode Toggle - only when multiple files */}
          {fileEntries.length > 1 && (
            <div className="upload-category-mode-toggle">
              <Label className="upload-category-mode-label">
                {isDE ? 'Kategoriezuordnung' : 'Category Assignment'}
              </Label>
              <div className="upload-category-mode-buttons">
                <button
                  type="button"
                  className={`upload-category-mode-btn ${categoryMode === 'single' ? 'upload-category-mode-btn-active' : ''}`}
                  onClick={() => setCategoryMode('single')}
                >
                  {isDE ? 'Einzelne Kategorie' : 'Single Category'}
                </button>
                <button
                  type="button"
                  className={`upload-category-mode-btn ${categoryMode === 'multiple' ? 'upload-category-mode-btn-active' : ''}`}
                  onClick={() => setCategoryMode('multiple')}
                >
                  {isDE ? 'Mehrere Kategorien' : 'Multiple Categories'}
                </button>
              </div>
            </div>
          )}

          {/* File list with optional custom names and per-file categories */}
          {fileEntries.length > 0 && (
            <div className="upload-file-list">
              {fileEntries.map((entry, index) => (
                <div key={index} className="upload-file-entry">
                  <div className="upload-file-entry-header">
                    <FileUp className="upload-file-entry-icon" />
                    <span className="upload-file-entry-name">{entry.file.name}</span>
                    <span className="upload-file-entry-size">
                      {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      className="upload-file-entry-remove"
                      onClick={() => removeFile(index)}
                    >
                      <Trash2 className="upload-file-entry-remove-icon" />
                    </button>
                  </div>
                  <Input
                    value={entry.customName}
                    onChange={(e) => updateCustomName(index, e.target.value)}
                    placeholder={isDE ? 'Benutzerdefinierter Dateiname (optional)' : 'Custom file name (optional)'}
                    className="upload-file-entry-custom-name"
                  />
                  {/* Per-file category dropdowns in 'multiple' mode */}
                  {categoryMode === 'multiple' && fileEntries.length > 1 && renderPerFileCategoryDropdowns(entry, index)}
                </div>
              ))}
            </div>
          )}

          {/* 4. Document Categories - only in single mode */}
          {(categoryMode === 'single' || fileEntries.length <= 1) && (
            <>
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
                  {allMainCategories.map(cat => (
                    <option key={cat.code} value={cat.code}>
                      {getBilingualLabel(cat)}
                    </option>
                  ))}
                </select>
                
                {/* Add custom main category */}
                {!showCustomMainInput ? (
                  renderAddCustomButton(
                    isDE ? 'Eigene Hauptkategorie hinzufügen' : 'Add custom main category',
                    showCustomMainInput,
                    setShowCustomMainInput
                  )
                ) : (
                  <div className="upload-custom-input">
                    <Input
                      value={customMainCategory}
                      onChange={(e) => setCustomMainCategory(e.target.value)}
                      placeholder={isDE ? 'Name der Hauptkategorie' : 'Main category name'}
                    />
                    <Button 
                      type="button" 
                      size="sm"
                      onClick={handleAddCustomMainCategory}
                      disabled={!customMainCategory.trim()}
                    >
                      {isDE ? 'Hinzufügen' : 'Add'}
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setShowCustomMainInput(false);
                        setCustomMainCategory('');
                      }}
                    >
                      {isDE ? 'Abbrechen' : 'Cancel'}
                    </Button>
                  </div>
                )}
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
                        {getBilingualLabel(cat)}
                      </option>
                    ))}
                  </select>
                  
                  {/* Add custom sub category */}
                  {!showCustomSubInput ? (
                    renderAddCustomButton(
                      isDE ? 'Eigene Unterkategorie hinzufügen' : 'Add custom sub category',
                      showCustomSubInput,
                      setShowCustomSubInput
                    )
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
                        onClick={handleAddCustomSubCategory}
                        disabled={!customSubCategory.trim()}
                      >
                        {isDE ? 'Hinzufügen' : 'Add'}
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setShowCustomSubInput(false);
                          setCustomSubCategory('');
                        }}
                      >
                        {isDE ? 'Abbrechen' : 'Cancel'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Share Enabled Toggle */}
          <div className="upload-field" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Label style={{ marginBottom: 0 }}>
              {shareEnabled
                ? (isDE ? 'Freigabe aktiviert' : 'Sharing Enabled')
                : (isDE ? 'Freigabe deaktiviert' : 'Sharing Disabled')}
            </Label>
            <button
              type="button"
              onClick={() => setShareEnabled(!shareEnabled)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                background: shareEnabled ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: shareEnabled ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          {/* Submit */}
          <div className="upload-modal-actions">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
              {isDE ? 'Abbrechen' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isUploading || fileEntries.length === 0 || !allCategoriesValid()}>
              {isUploading 
                ? (isDE ? 'Wird hochgeladen...' : 'Uploading...') 
                : (isDE 
                  ? `${fileEntries.length} Datei(en) hochladen` 
                  : `Upload ${fileEntries.length} file(s)`)}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}