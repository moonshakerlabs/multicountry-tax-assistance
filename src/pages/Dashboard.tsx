import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { User, FileText, LogOut, FolderOpen, Upload, ChevronRight } from 'lucide-react';
import './Dashboard.css';

interface DocumentSummary {
  country: string;
  tax_year: string;
  count: number;
}

export default function Dashboard() {
  const { profile, user, signOut } = useAuth();
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const displayName = profile?.first_name 
    ? profile.first_name 
    : profile?.email?.split('@')[0] || 'User';

  const isProfileComplete = profile?.first_name && profile?.last_name;

  useEffect(() => {
    async function fetchDocumentSummary() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('country, tax_year')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        // Group by country and tax_year
        const summaryMap = new Map<string, number>();
        data?.forEach(doc => {
          const key = `${doc.country || 'Unknown'}|${doc.tax_year || 'Unknown'}`;
          summaryMap.set(key, (summaryMap.get(key) || 0) + 1);
        });
        
        const summary: DocumentSummary[] = Array.from(summaryMap.entries()).map(([key, count]) => {
          const [country, tax_year] = key.split('|');
          return { country, tax_year, count };
        }).sort((a, b) => b.tax_year.localeCompare(a.tax_year));
        
        setDocumentSummary(summary);
        setTotalDocuments(data?.length || 0);
      } catch (error) {
        console.error('Error fetching document summary:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchDocumentSummary();
  }, [user]);

  const getCountryLabel = (code: string) => {
    const labels: Record<string, string> = {
      'GERMANY': 'Germany',
      'INDIA': 'India',
    };
    return labels[code] || code;
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-logo">
            <Link to="/" className="dashboard-logo-link">
              <div className="dashboard-logo-icon" />
              <span className="dashboard-logo-text">TaxAlign</span>
            </Link>
          </div>
          <div className="dashboard-header-actions">
            <span className="dashboard-email">{profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="dashboard-action-icon" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="dashboard-welcome">
            <h1 className="dashboard-title">Welcome, {displayName}</h1>
            <p className="dashboard-subtitle">
              Manage your cross-border tax documents in one place.
            </p>
          </div>

          {/* Profile Completion Alert */}
          {!isProfileComplete && (
            <div className="dashboard-alert">
              <p className="dashboard-alert-text">
                <strong>Complete your profile to get started.</strong>
                {' '}Add your name and preferences to personalize your experience.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/profile">Complete Profile</Link>
              </Button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="dashboard-actions-grid">
            <Link to="/vault" className="dashboard-action-card dashboard-action-primary">
              <div className="dashboard-action-icon-wrapper dashboard-action-icon-primary">
                <FolderOpen className="dashboard-card-icon" />
              </div>
              <div className="dashboard-action-content">
                <h3 className="dashboard-action-title">Document Vault</h3>
                <p className="dashboard-action-description">
                  View, upload, and organize your tax documents.
                </p>
              </div>
              <ChevronRight className="dashboard-action-arrow" />
            </Link>

            <Link to="/profile" className="dashboard-action-card">
              <div className="dashboard-action-icon-wrapper">
                <User className="dashboard-card-icon" />
              </div>
              <div className="dashboard-action-content">
                <h3 className="dashboard-action-title">Edit Profile</h3>
                <p className="dashboard-action-description">
                  Update your personal information and preferences.
                </p>
              </div>
              <ChevronRight className="dashboard-action-arrow" />
            </Link>
          </div>

          {/* Document Summary */}
          <div className="dashboard-summary-section">
            <div className="dashboard-summary-header">
              <h2 className="dashboard-summary-title">
                <FileText className="dashboard-summary-icon" />
                Document Summary
              </h2>
              {totalDocuments > 0 && (
                <span className="dashboard-summary-count">
                  {totalDocuments} document{totalDocuments !== 1 ? 's' : ''} total
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="dashboard-summary-loading">Loading...</div>
            ) : totalDocuments === 0 ? (
              <div className="dashboard-summary-empty">
                <FolderOpen className="dashboard-empty-icon" />
                <h3 className="dashboard-empty-title">No documents yet</h3>
                <p className="dashboard-empty-text">
                  Upload your first document to get started.
                </p>
                <Button asChild>
                  <Link to="/vault">
                    <Upload className="dashboard-btn-icon" />
                    Go to Document Vault
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="dashboard-summary-grid">
                {documentSummary.map((item, index) => (
                  <Link 
                    key={index} 
                    to="/vault" 
                    className="dashboard-summary-card"
                  >
                    <div className="dashboard-summary-card-header">
                      <span className="dashboard-summary-country">
                        {getCountryLabel(item.country)}
                      </span>
                      <span className="dashboard-summary-year">{item.tax_year}</span>
                    </div>
                    <div className="dashboard-summary-card-body">
                      <span className="dashboard-summary-doc-count">{item.count}</span>
                      <span className="dashboard-summary-doc-label">
                        document{item.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
