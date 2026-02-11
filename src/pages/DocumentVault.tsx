import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  LogOut, 
  Upload, 
  Filter, 
  FolderOpen, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  User,
  Search,
  X,
  MoreHorizontal,
  Share2
} from 'lucide-react';
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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDocumentIds, setShareDocumentIds] = useState<string[]>([]);

  
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
        // Fetch user profile
        const { data: profileData } = await supabase
          .from('user_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileData) {
          setUserProfile(profileData as UserProfile);
        }
        
        // Fetch documents
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
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.file_name?.toLowerCase().includes(query) ||
        doc.main_category?.toLowerCase().includes(query) ||
        doc.sub_category?.toLowerCase().includes(query)
      );
    }
    
    // Apply country filter
    if (filterCountry !== 'all') {
      filtered = filtered.filter(doc => doc.country === filterCountry);
    }
    
    // Apply year filter
    if (filterYear !== 'all') {
      filtered = filtered.filter(doc => doc.tax_year === filterYear);
    }
    
    // Group by Country → Tax Year → Main Category
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
      if (next.has(country)) {
        next.delete(country);
      } else {
        next.add(country);
      }
      return next;
    });
  };

  const toggleYear = (key: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
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

  const handleShareAll = () => {
    const shareableIds = documents.filter(d => d.share_enabled).map(d => d.id);
    if (shareableIds.length === 0) {
      return;
    }
    setShareDocumentIds(shareableIds);
    setShowShareModal(true);
  };

  const handleShareDocument = (doc: Document) => {
    if (!doc.share_enabled) return;
    setShareDocumentIds([doc.id]);
    setShowShareModal(true);
  };

  const handleShareFolder = (docs: Document[]) => {
    const shareableIds = docs.filter(d => d.share_enabled).map(d => d.id);
    if (shareableIds.length === 0) {
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE
          ? 'Leere Ordnerfreigabe ist nicht erlaubt. Aktivieren Sie die Freigabe für mindestens ein Dokument.'
          : 'Empty folder sharing is not allowed. Enable sharing for at least one document in this folder.',
        variant: 'destructive',
      });
      return;
    }
    setShareDocumentIds(shareableIds);
    setShowShareModal(true);
  };

  const toggleShareEnabled = async (doc: Document) => {
    if (!user) return;
    const newValue = !doc.share_enabled;
    await supabase
      .from('documents')
      .update({ share_enabled: newValue })
      .eq('id', doc.id)
      .eq('user_id', user.id);
    await refreshDocuments();
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

  return (
    <div className="vault-container">
      {/* Header */}
      <header className="vault-header">
        <div className="vault-header-content">
          <div className="vault-logo">
            <Link to="/" className="vault-logo-link">
              <div className="vault-logo-icon" />
              <span className="vault-logo-text">WorTaF</span>
            </Link>
          </div>
          <div className="vault-header-actions">
            <Button asChild variant="ghost" size="sm">
              <Link to="/profile">
                <User className="vault-action-icon" />
                {isDE ? 'Profil' : 'Profile'}
              </Link>
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
            <Button onClick={() => setShowUploadModal(true)} className="vault-upload-btn">
              <Upload className="vault-upload-icon" />
              {isDE ? 'Dokument hochladen' : 'Upload Document'}
            </Button>
            {documents.some(d => d.share_enabled) && (
              <Button onClick={handleShareAll} variant="outline" className="vault-share-btn">
                <Share2 className="vault-upload-icon" />
                {isDE ? 'Alle teilen' : 'Share All'}
              </Button>
            )}
            
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
                  <Upload className="vault-upload-icon" />
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
                                  return (
                                    <div key={catKey} className="vault-category-group">
                                      <button 
                                        className="vault-group-header vault-category-header"
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
                                        </span>
                                        <button
                                          className="vault-folder-share-btn"
                                          onClick={(e) => { e.stopPropagation(); handleShareFolder(docs); }}
                                          title={isDE ? 'Ordner teilen' : 'Share folder'}
                                        >
                                          <Share2 className="vault-document-actions-icon" />
                                        </button>
                                      </button>
                                      
                                      {expandedCategories.has(catKey) && (
                                        <div className="vault-documents-list">
                                          {docs.map(doc => (
                                            <div key={doc.id} className="vault-document-item">
                                              <FileText className="vault-document-icon" />
                                              <div className="vault-document-info">
                                                <span className="vault-document-name">
                                                  {doc.file_name || 'Unnamed document'}
                                                </span>
                                                <span className="vault-document-meta">
                                                  {doc.sub_category?.replace(/_/g, ' ') || doc.custom_sub_category}
                                                </span>
                                              </div>
                                              <span className="vault-document-date">
                                                {new Date(doc.created_at).toLocaleDateString(isDE ? 'de-DE' : 'en-GB')}
                                              </span>
                                              {doc.share_enabled && (
                                                <button
                                                  className="vault-document-share-btn"
                                                  onClick={() => handleShareDocument(doc)}
                                                  title={isDE ? 'Teilen' : 'Share'}
                                                >
                                                  <Share2 className="vault-document-actions-icon" />
                                                </button>
                                              )}
                                              <button 
                                                className="vault-document-actions-btn"
                                                onClick={() => setSelectedDocument(doc)}
                                                title={isDE ? 'Aktionen' : 'Actions'}
                                              >
                                                <MoreHorizontal className="vault-document-actions-icon" />
                                              </button>
                                            </div>
                                          ))}
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
    </div>
  );
}
