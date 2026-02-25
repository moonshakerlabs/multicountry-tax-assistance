import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { supabase } from '@/integrations/supabase/client';
import { APP_NAME, APP_TAGLINE } from '@/lib/appConfig';
import { 
  LogOut, 
  Upload, 
  Filter, 
  FolderOpen, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  Search,
  X,
  MoreHorizontal,
  Share2,
  CheckSquare,
  Square,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Trash2,
  AlertTriangle,
  Brain,
  HeadphonesIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UploadModal from '@/components/documents/UploadModal';
import DocumentActions from '@/components/documents/DocumentActions';
import ShareModal from '@/components/documents/ShareModal';
import { getCountryDisplayName, ALL_COUNTRIES } from '@/lib/countryLanguageData';
import './DocumentVault.css';

interface Document {
  id: string;
  user_id: string;
  country: string | null;
  tax_year: string | null;
  main_category: string | null;
  sub_category: string | null;
  custom_sub_category: string | null;
  file_name: string | null;
  file_path: string | null;
  created_at: string;
  share_enabled: boolean;
}

interface UserProfile {
  primary_tax_residency: string;
  other_tax_countries: string[];
  preferred_language: string;
}

interface GroupedDocuments {
  [country: string]: {
    [taxYear: string]: {
      [mainCategory: string]: Document[];
    };
  };
}

export default function DocumentVault() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { hasFeature } = useFeatureAccess();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDocumentIds, setShareDocumentIds] = useState<string[]>([]);

  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter states
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  
  // Expansion states
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const isDE = userProfile?.preferred_language === 'DE';

  // Get user's countries from profile (primary + other)
  const userCountries = useMemo(() => {
    if (!userProfile) return [];
    const countries = [userProfile.primary_tax_residency];
    if (userProfile.other_tax_countries?.length) {
      countries.push(...userProfile.other_tax_countries);
    }
    return countries.filter((c, i, arr) => arr.indexOf(c) === i);
  }, [userProfile]);

  // Fetch user profile and documents
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        const { data: profileData } = await supabase
          .from('user_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileData) {
          setUserProfile(profileData as UserProfile);
        }
        
        const { data: docsData, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setDocuments(docsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [user]);

  // Get unique years from documents for filter
  const filterYears = useMemo(() => {
    const years = new Set<string>();
    documents.forEach(doc => {
      if (doc.tax_year) years.add(doc.tax_year);
    });
    return Array.from(years).sort().reverse();
  }, [documents]);

  // Filter and group documents
  const filteredAndGrouped = useMemo(() => {
    let filtered = documents;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.file_name?.toLowerCase().includes(query) ||
        doc.main_category?.toLowerCase().includes(query) ||
        doc.sub_category?.toLowerCase().includes(query)
      );
    }
    
    if (filterCountry !== 'all') {
      filtered = filtered.filter(doc => doc.country === filterCountry);
    }
    
    if (filterYear !== 'all') {
      filtered = filtered.filter(doc => doc.tax_year === filterYear);
    }
    
    const grouped: GroupedDocuments = {};
    
    filtered.forEach(doc => {
      const country = doc.country || 'Unknown';
      const year = doc.tax_year || 'Unknown';
      const category = doc.main_category || 'Uncategorized';
      
      if (!grouped[country]) grouped[country] = {};
      if (!grouped[country][year]) grouped[country][year] = {};
      if (!grouped[country][year][category]) grouped[country][year][category] = [];
      
      grouped[country][year][category].push(doc);
    });
    
    return grouped;
  }, [documents, searchQuery, filterCountry, filterYear]);

  const toggleCountry = (country: string) => {
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country); else next.add(country);
      return next;
    });
  };

  const toggleYear = (key: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const refreshDocuments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
  };

  const handleUploadComplete = async () => {
    await refreshDocuments();
    setShowUploadModal(false);
  };

  const handleDocumentUpdated = async () => {
    await refreshDocuments();
    setSelectedDocument(null);
  };

  const handleDocumentDeleted = async () => {
    await refreshDocuments();
    setSelectedDocument(null);
  };

  // Share All: select all share-enabled docs and open modal
  const handleShareAll = () => {
    const shareableIds = documents.filter(d => d.share_enabled).map(d => d.id);
    if (shareableIds.length === 0) {
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE
          ? 'Keine freigebbaren Dokumente vorhanden. Aktivieren Sie zuerst die Freigabe für Dokumente.'
          : 'No shareable documents found. Enable sharing for documents first.',
        variant: 'destructive',
      });
      return;
    }
    setShareDocumentIds(shareableIds);
    setShowShareModal(true);
  };

  // Enter selection mode
  const handleShareSelected = () => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  // Exit selection mode
  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Toggle single document selection (only share-enabled)
  const handleToggleDoc = (doc: Document) => {
    if (!deleteSelectionMode && !doc.share_enabled) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(doc.id)) next.delete(doc.id); else next.add(doc.id);
      return next;
    });
  };

  // Select all docs in a folder (category) - respects mode
  const handleSelectFolder = (docs: Document[]) => {
    const eligibleIds = deleteSelectionMode
      ? docs.map(d => d.id)
      : docs.filter(d => d.share_enabled).map(d => d.id);
    if (eligibleIds.length === 0) {
      toast({
        title: isDE ? 'Hinweis' : 'Notice',
        description: isDE
          ? 'Keine auswählbaren Dokumente in diesem Ordner.'
          : 'No selectable documents in this folder.',
      });
      return;
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      eligibleIds.forEach(id => next.add(id));
      return next;
    });
  };

  // Toggle share_enabled for all documents in a folder (category)
  const handleToggleFolderSharing = async (docs: Document[], enable: boolean) => {
    if (!user) return;
    const ids = docs.map(d => d.id);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ share_enabled: enable })
        .eq('user_id', user.id)
        .in('id', ids);
      if (error) throw error;
      await refreshDocuments();
      toast({
        title: enable ? (isDE ? 'Freigabe aktiviert' : 'Sharing Enabled') : (isDE ? 'Freigabe deaktiviert' : 'Sharing Disabled'),
        description: isDE
          ? `${ids.length} Dokument(e) in diesem Ordner aktualisiert.`
          : `${ids.length} document(s) in this folder updated.`,
      });
    } catch (err: any) {
      toast({ title: isDE ? 'Fehler' : 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Share selected documents
  const handleShareSelectedDocs = () => {
    if (selectedIds.size === 0) {
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE ? 'Bitte mindestens ein Dokument auswählen.' : 'Please select at least one document.',
        variant: 'destructive',
      });
      return;
    }
    setShareDocumentIds(Array.from(selectedIds));
    setShowShareModal(true);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Delete confirmation state
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Delete All documents
  const handleDeleteAll = () => {
    if (documents.length === 0) {
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE ? 'Keine Dokumente vorhanden.' : 'No documents found.',
        variant: 'destructive',
      });
      return;
    }
    setBulkDeleteIds(documents.map(d => d.id));
    setShowBulkDeleteConfirm(true);
  };

  // Enter selection mode for delete
  const [deleteSelectionMode, setDeleteSelectionMode] = useState(false);

  const handleDeleteSelected = () => {
    setDeleteSelectionMode(true);
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  // Confirm delete selected
  const handleConfirmDeleteSelected = () => {
    if (selectedIds.size === 0) {
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE ? 'Bitte mindestens ein Dokument auswählen.' : 'Please select at least one document.',
        variant: 'destructive',
      });
      return;
    }
    setBulkDeleteIds(Array.from(selectedIds));
    setShowBulkDeleteConfirm(true);
  };

  // Execute bulk delete
  const handleBulkDelete = async () => {
    if (!user || bulkDeleteIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      // Get file paths for storage deletion
      const docsToDelete = documents.filter(d => bulkDeleteIds.includes(d.id));
      const storagePaths = docsToDelete
        .filter(d => d.file_path && !d.file_path.startsWith('gdrive://'))
        .map(d => d.file_path!);

      // Delete from storage
      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('user-documents')
          .remove(storagePaths);
        if (storageError) console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', user.id)
        .in('id', bulkDeleteIds);

      if (dbError) throw dbError;

      toast({
        title: isDE ? 'Dokumente gelöscht' : 'Documents deleted',
        description: isDE
          ? `${bulkDeleteIds.length} Dokument(e) gelöscht.`
          : `${bulkDeleteIds.length} document(s) deleted.`,
      });

      await refreshDocuments();
    } catch (err: any) {
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
      setBulkDeleteIds([]);
      setSelectionMode(false);
      setDeleteSelectionMode(false);
      setSelectedIds(new Set());
    }
  };

  // Override cancel selection to also clear delete mode
  const handleCancelSelectionFull = () => {
    setSelectionMode(false);
    setDeleteSelectionMode(false);
    setSelectedIds(new Set());
  };

  const getCountryLabel = (code: string) => {
    const country = ALL_COUNTRIES.find(c => c.code === code);
    if (!country) return code;
    return isDE && country.nameNative !== country.nameEn 
      ? country.nameNative 
      : country.nameEn;
  };

  if (isLoading) {
    return (
      <div className="vault-container">
        <div className="vault-loading">
          {isDE ? 'Laden...' : 'Loading...'}
        </div>
      </div>
    );
  }

  const hasDocuments = documents.length > 0;
  const hasFilteredResults = Object.keys(filteredAndGrouped).length > 0;
  const shareableCount = documents.filter(d => d.share_enabled).length;

  return (
    <div className="vault-container">
      {/* Header */}
      <header className="vault-header">
        <div className="vault-header-content">
          <div className="vault-logo">
            <Link to="/" className="vault-logo-link">
              <img src="/images/taxbebo-logo.png" alt={APP_NAME} className="vault-logo-icon" />
              <span className="vault-logo-text">{APP_NAME} – {APP_TAGLINE}</span>
            </Link>
          </div>
          <div className="vault-header-actions">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/profile">Profile</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/community">TaxOverFlow</Link>
            </Button>
            {hasFeature('AI_TOOLS_ACCESS') && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/ai-tools"><Brain className="vault-action-icon" />AI Tools</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/support"><HeadphonesIcon className="vault-action-icon" />{isDE ? 'Support' : 'Support'}</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="vault-action-icon" />
              {isDE ? 'Abmelden' : 'Sign out'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="vault-main">
        <div className="vault-content">
          {/* Title Section */}
          <div className="vault-title-section">
            <h1 className="vault-title">
              {isDE ? 'Dokumententresor' : 'Document Vault'}
            </h1>
            <p className="vault-subtitle">
              {isDE 
                ? 'Laden Sie Ihre Steuerdokumente sicher hoch und organisieren Sie sie.'
                : 'Securely upload and organise your tax documents.'}
            </p>
          </div>

          {/* Actions Bar */}
          <div className="vault-actions-bar">
            <div className="vault-actions-left">
              <Button onClick={() => setShowUploadModal(true)} className="vault-upload-btn">
                <Upload className="vault-btn-icon" />
                {isDE ? 'Dokument hochladen' : 'Upload Document'}
              </Button>

              {!selectionMode && hasDocuments && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="vault-share-btn">
                        <Share2 className="vault-btn-icon" />
                        {isDE ? 'Teilen' : 'Share'}
                        <ChevronDown className="vault-btn-icon ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={handleShareAll}>
                        <Share2 className="vault-btn-icon" />
                        {isDE ? 'Alle teilen' : 'Share All'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShareSelected}>
                        <CheckSquare className="vault-btn-icon" />
                        {isDE ? 'Auswahl teilen' : 'Share Selected'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="vault-delete-btn">
                        <Trash2 className="vault-btn-icon" />
                        {isDE ? 'Löschen' : 'Delete'}
                        <ChevronDown className="vault-btn-icon ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={handleDeleteAll} className="text-destructive">
                        <Trash2 className="vault-btn-icon" />
                        {isDE ? 'Alle löschen' : 'Delete All'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDeleteSelected} className="text-destructive">
                        <CheckSquare className="vault-btn-icon" />
                        {isDE ? 'Auswahl löschen' : 'Delete Selected'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {selectionMode && (
                <>
                  {deleteSelectionMode ? (
                    <Button
                      onClick={handleConfirmDeleteSelected}
                      variant="destructive"
                      disabled={selectedIds.size === 0}
                    >
                      <Trash2 className="vault-btn-icon" />
                      {isDE ? `${selectedIds.size} löschen` : `Delete ${selectedIds.size} selected`}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleShareSelectedDocs}
                      className="vault-share-confirm-btn"
                      disabled={selectedIds.size === 0}
                    >
                      <Share2 className="vault-btn-icon" />
                      {isDE ? `${selectedIds.size} teilen` : `Share ${selectedIds.size} selected`}
                    </Button>
                  )}
                  <Button onClick={handleDeselectAll} variant="ghost" size="sm" className="vault-deselect-btn">
                    <XCircle className="vault-btn-icon" />
                    {isDE ? 'Alle abwählen' : 'Deselect All'}
                  </Button>
                  <Button onClick={handleCancelSelectionFull} variant="ghost" size="sm" className="vault-cancel-btn">
                    <X className="vault-btn-icon" />
                    {isDE ? 'Abbrechen' : 'Cancel'}
                  </Button>
                </>
              )}
            </div>

            <div className="vault-search">
              <Search className="vault-search-icon" />
              <Input
                type="text"
                placeholder={isDE ? 'Dokumente suchen...' : 'Search documents...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="vault-search-input"
              />
              {searchQuery && (
                <button 
                  className="vault-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="vault-search-clear-icon" />
                </button>
              )}
            </div>
          </div>

          {/* Selection mode banner */}
          {selectionMode && (
            <div className="vault-selection-banner">
              {deleteSelectionMode ? <Trash2 className="vault-selection-banner-icon" /> : <CheckSquare className="vault-selection-banner-icon" />}
              <span>
                {deleteSelectionMode
                  ? (isDE
                    ? `Lösch-Auswahlmodus aktiv – Klicken Sie auf Ordner oder Dateien. ${selectedIds.size} ausgewählt.`
                    : `Delete selection mode – click folders or files to select. ${selectedIds.size} selected.`)
                  : (isDE
                    ? `Auswahlmodus aktiv – Klicken Sie auf Ordner oder Dateien (mit aktivierter Freigabe). ${selectedIds.size} ausgewählt.`
                    : `Selection mode active – click folders or files with sharing enabled. ${selectedIds.size} selected.`)}
              </span>
            </div>
          )}

          {/* Filters */}
          <div className="vault-filters">
            <div className="vault-filter">
              <Filter className="vault-filter-icon" />
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="vault-filter-select"
              >
                <option value="all">{isDE ? 'Alle Länder' : 'All Countries'}</option>
                {userCountries.map(country => (
                  <option key={country} value={country}>
                    {getCountryLabel(country)}
                  </option>
                ))}
              </select>
            </div>
            <div className="vault-filter">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="vault-filter-select"
              >
                <option value="all">{isDE ? 'Alle Jahre' : 'All Years'}</option>
                {filterYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Documents List */}
          <div className="vault-documents">
            {!hasDocuments ? (
              <div className="vault-empty">
                <FolderOpen className="vault-empty-icon" />
                <h3 className="vault-empty-title">
                  {isDE ? 'Keine Dokumente' : 'No documents yet'}
                </h3>
                <p className="vault-empty-text">
                  {isDE 
                    ? 'Laden Sie Ihr erstes Dokument hoch, um zu beginnen.'
                    : 'Upload your first document to get started.'}
                </p>
                <Button onClick={() => setShowUploadModal(true)} className="vault-empty-btn">
                  <Upload className="vault-btn-icon" />
                  {isDE ? 'Dokument hochladen' : 'Upload Document'}
                </Button>
              </div>
            ) : !hasFilteredResults ? (
              <div className="vault-no-results">
                <p>{isDE ? 'Keine Dokumente gefunden.' : 'No documents match your filters.'}</p>
              </div>
            ) : (
              Object.entries(filteredAndGrouped).map(([country, years]) => (
                <div key={country} className="vault-country-group">
                  <button 
                    className="vault-group-header vault-country-header"
                    onClick={() => toggleCountry(country)}
                  >
                    {expandedCountries.has(country) ? (
                      <ChevronDown className="vault-chevron" />
                    ) : (
                      <ChevronRight className="vault-chevron" />
                    )}
                    <span className="vault-group-title">{getCountryLabel(country)}</span>
                    <span className="vault-group-count">
                      {Object.values(years).reduce((acc, cats) => 
                        acc + Object.values(cats).reduce((a, docs) => a + docs.length, 0), 0
                      )} {isDE ? 'Dokumente' : 'documents'}
                    </span>
                  </button>
                  
                  {expandedCountries.has(country) && (
                    <div className="vault-year-groups">
                      {Object.entries(years).sort(([a], [b]) => b.localeCompare(a)).map(([year, categories]) => {
                        const yearKey = `${country}-${year}`;
                        return (
                          <div key={yearKey} className="vault-year-group">
                            <button 
                              className="vault-group-header vault-year-header"
                              onClick={() => toggleYear(yearKey)}
                            >
                              {expandedYears.has(yearKey) ? (
                                <ChevronDown className="vault-chevron" />
                              ) : (
                                <ChevronRight className="vault-chevron" />
                              )}
                              <span className="vault-group-title">{year}</span>
                              <span className="vault-group-count">
                                {Object.values(categories).reduce((a, docs) => a + docs.length, 0)} {isDE ? 'Dokumente' : 'documents'}
                              </span>
                            </button>
                            
                            {expandedYears.has(yearKey) && (
                              <div className="vault-category-groups">
                                {Object.entries(categories).map(([category, docs]) => {
                                  const catKey = `${yearKey}-${category}`;
                                  const folderShareableCount = docs.filter(d => d.share_enabled).length;
                                  const folderSelectedCount = docs.filter(d => selectedIds.has(d.id)).length;
                                  const allFolderSelected = folderShareableCount > 0 && folderSelectedCount === folderShareableCount;

                                  const allFolderEnabled = docs.every(d => d.share_enabled);
                                  const anyFolderEnabled = docs.some(d => d.share_enabled);

                                  return (
                                    <div key={catKey} className="vault-category-group">
                                      <div className="vault-category-row">
                                        {/* Folder checkbox in selection mode */}
                                        {selectionMode && (deleteSelectionMode || folderShareableCount > 0) && (
                                          <button
                                            className="vault-select-checkbox"
                                            onClick={(e) => { e.stopPropagation(); handleSelectFolder(docs); }}
                                            title={isDE ? 'Ordner auswählen' : 'Select folder'}
                                          >
                                            {allFolderSelected
                                              ? <CheckSquare className="vault-checkbox-icon vault-checkbox-checked" />
                                              : folderSelectedCount > 0
                                              ? <CheckSquare className="vault-checkbox-icon vault-checkbox-partial" />
                                              : <Square className="vault-checkbox-icon" />
                                            }
                                          </button>
                                        )}
                                        <button 
                                          className="vault-group-header vault-category-header"
                                          style={{ flex: 1 }}
                                          onClick={() => toggleCategory(catKey)}
                                        >
                                          {expandedCategories.has(catKey) ? (
                                            <ChevronDown className="vault-chevron" />
                                          ) : (
                                            <ChevronRight className="vault-chevron" />
                                          )}
                                          <span className="vault-group-title">{category.replace(/_/g, ' ')}</span>
                                          <span className="vault-group-count">
                                            {docs.length}
                                            {' '}· {folderShareableCount}/{docs.length} {isDE ? 'freigegeben' : 'sharing enabled'}
                                          </span>
                                        </button>
                                        {/* Folder-level sharing toggle (not in selection mode) */}
                                        {!selectionMode && (
                                          <button
                                            className={`vault-folder-share-toggle ${allFolderEnabled ? 'vault-folder-share-on' : ''}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleFolderSharing(docs, !allFolderEnabled);
                                            }}
                                            title={allFolderEnabled
                                              ? (isDE ? 'Freigabe für Ordner deaktivieren' : 'Disable sharing for folder')
                                              : (isDE ? 'Freigabe für Ordner aktivieren' : 'Enable sharing for folder')}
                                          >
                                            {allFolderEnabled
                                              ? <ToggleRight className="vault-folder-toggle-icon vault-folder-toggle-on" />
                                              : <ToggleLeft className="vault-folder-toggle-icon" />
                                            }
                                            <span className="vault-folder-toggle-label">
                                              {allFolderEnabled
                                                ? (isDE ? 'Freigabe aktiviert' : 'Sharing Enabled')
                                                : anyFolderEnabled
                                                ? (isDE ? 'Teilweise freigegeben' : 'Partial')
                                                : (isDE ? 'Freigabe deaktiviert' : 'Sharing Disabled')}
                                            </span>
                                          </button>
                                        )}
                                      </div>
                                      
                                      {expandedCategories.has(catKey) && (
                                        <div className="vault-documents-list">
                                          {docs.map(doc => {
                                            const isSelected = selectedIds.has(doc.id);
                                            const isSelectable = deleteSelectionMode || doc.share_enabled;

                                            return (
                                              <div
                                                key={doc.id}
                                                className={`vault-document-item ${selectionMode && isSelectable ? 'vault-document-selectable' : ''} ${isSelected ? 'vault-document-selected' : ''} ${selectionMode && !isSelectable ? 'vault-document-not-selectable' : ''}`}
                                                onClick={selectionMode && isSelectable ? () => handleToggleDoc(doc) : undefined}
                                              >
                                                {/* Checkbox in selection mode */}
                                                {selectionMode && (
                                                  <div className="vault-doc-checkbox">
                                                    {isSelectable
                                                      ? isSelected
                                                        ? <CheckSquare className="vault-checkbox-icon vault-checkbox-checked" />
                                                        : <Square className="vault-checkbox-icon" />
                                                      : <Square className="vault-checkbox-icon vault-checkbox-disabled" />
                                                    }
                                                  </div>
                                                )}
                                                <FileText className={`vault-document-icon ${isSelected ? 'vault-document-icon-selected' : ''}`} />
                                                <div className="vault-document-info">
                                                  <span className="vault-document-name">
                                                    {doc.file_name || 'Unnamed document'}
                                                  </span>
                                                  <span className="vault-document-meta">
                                                    {doc.sub_category?.replace(/_/g, ' ') || doc.custom_sub_category}
                                                    {doc.share_enabled ? (
                                                      <span className="vault-share-enabled-badge">
                                                        {' '}· {isDE ? 'Freigabe aktiviert' : 'Sharing Enabled'}
                                                      </span>
                                                    ) : (
                                                      <span className="vault-share-disabled-badge">
                                                        {' '}· {isDE ? 'Freigabe deaktiviert' : 'Sharing Disabled'}
                                                      </span>
                                                    )}
                                                  </span>
                                                </div>
                                                <span className="vault-document-date">
                                                  {new Date(doc.created_at).toLocaleDateString(isDE ? 'de-DE' : 'en-GB')}
                                                </span>
                                                {!selectionMode && (
                                                  <button 
                                                    className="vault-document-actions-btn"
                                                    onClick={() => setSelectedDocument(doc)}
                                                    title={isDE ? 'Aktionen' : 'Actions'}
                                                  >
                                                    <MoreHorizontal className="vault-document-actions-icon" />
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          userProfile={userProfile}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Document Actions Modal */}
      {selectedDocument && (
        <DocumentActions
          document={selectedDocument}
          isDE={isDE}
          profileLang={userProfile?.preferred_language || 'EN'}
          onClose={() => setSelectedDocument(null)}
          onDocumentUpdated={handleDocumentUpdated}
          onDocumentDeleted={handleDocumentDeleted}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          documentIds={shareDocumentIds}
          isDE={isDE}
          onClose={() => setShowShareModal(false)}
          onShareComplete={() => refreshDocuments()}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="doc-actions-overlay" onClick={() => !isBulkDeleting && setShowBulkDeleteConfirm(false)}>
          <div className="doc-actions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="doc-delete-confirmation">
              <AlertTriangle className="doc-delete-icon" />
              <p className="doc-delete-message">
                {isDE
                  ? `Sind Sie sicher, dass Sie ${bulkDeleteIds.length} Dokument(e) löschen möchten?`
                  : `Are you sure you want to delete ${bulkDeleteIds.length} document(s)?`}
              </p>
              <p className="doc-delete-warning">
                {isDE ? 'Diese Aktion kann nicht rückgängig gemacht werden.' : 'This action cannot be undone.'}
              </p>
              <div className="doc-delete-actions">
                <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)} disabled={isBulkDeleting}>
                  {isDE ? 'Abbrechen' : 'Cancel'}
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting}>
                  {isBulkDeleting
                    ? (isDE ? 'Löschen...' : 'Deleting...')
                    : (isDE ? 'Löschen' : 'Delete')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
