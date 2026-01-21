import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { X, Upload, Plus, FileUp } from 'lucide-react';
import { getMainCategoriesForCountry, getSubCategoriesForCountry, getCategoryLabel } from '@/lib/categories';
import { ALL_COUNTRIES } from '@/lib/countryLanguageData';
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

export default function UploadModal({ userProfile, onClose, onUploadComplete }: UploadModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
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
      
      // Validate file size (50MB max)
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
      
      // Refresh custom categories
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
      // Generate unique document ID
      const documentId = crypto.randomUUID();
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${documentId}.${fileExt}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Create document record
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
        // Rollback: delete uploaded file
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
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: isDE ? 'Hochladen fehlgeschlagen' : 'Upload failed',
        description: isDE 
          ? 'Das Dokument konnte nicht hochgeladen werden.'
          : 'Could not upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getCountryLabel = (code: string) => {
    const labels: Record<string, { en: string; de: string }> = {
      'GERMANY': { en: 'Germany', de: 'Deutschland' },
      'INDIA': { en: 'India', de: 'Indien' },
    };
    return labels[code]?.[isDE ? 'de' : 'en'] || code;
  };

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
