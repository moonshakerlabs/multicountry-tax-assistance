import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import './SharedDocumentView.css';

interface SharedDocument {
  id: string;
  fileName: string;
  fileType: string;
  mainCategory: string;
  subCategory: string;
  isDriveFile?: boolean;
  drivePermissionActive?: boolean;
}

type ViewState = 'loading' | 'invalid' | 'expired' | 'documents';

export default function SharedDocumentView() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>('loading');
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [allowDownload, setAllowDownload] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const callFunction = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/verify-share-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }

    callFunction({ action: 'validate', token }).then((data) => {
      if (data.error) {
        setState(data.error.includes('expired') ? 'expired' : 'invalid');
        setError(data.error);
      } else {
        setDocuments(data.documents || []);
        setAllowDownload(data.allowDownload);
        setSenderName(data.senderName || 'Someone');
        setExpiresAt(data.expiresAt);
        setState('documents');
      }
    }).catch(() => setState('invalid'));
  }, [token, callFunction]);

  const getFreshSignedUrl = async (documentId: string): Promise<{ url: string | null; error?: string; permissionRevoked?: boolean; fileName?: string }> => {
    try {
      const data = await callFunction({ action: 'get-url', token, documentId });
      if (data.error) {
        return { url: null, error: data.error, permissionRevoked: data.permissionRevoked };
      }
      return { url: data.signedUrl || null, fileName: data.fileName };
    } catch {
      return { url: null };
    }
  };

  const handleDownload = async (doc: SharedDocument) => {
    setLoadingDocId(doc.id);
    setError('');
    try {
      const result = await getFreshSignedUrl(doc.id);
      if (result.permissionRevoked) {
        setDocuments(prev => prev.map(d =>
          d.id === doc.id ? { ...d, drivePermissionActive: false } : d
        ));
        setError('Sharing permission for this document was revoked by the owner.');
      } else if (result.url) {
        if (doc.isDriveFile) {
          // Google Drive files open in Drive viewer
          window.open(result.url, '_blank');
        } else {
          // Supabase files — trigger download
          const link = document.createElement('a');
          link.href = result.url;
          link.download = doc.fileName || result.fileName || 'document';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        setError(result.error || 'Could not download document. Please try again.');
      }
    } finally {
      setLoadingDocId(null);
    }
  };

  if (state === 'loading') {
    return (
      <div className="shared-view-container">
        <div className="shared-view-card">
          <Loader2 className="shared-view-spinner" />
          <p>Loading shared documents...</p>
        </div>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="shared-view-container">
        <div className="shared-view-card">
          <AlertTriangle className="shared-view-error-icon" />
          <h2>Invalid Share Link</h2>
          <p>This share link is invalid or has been revoked.</p>
        </div>
      </div>
    );
  }

  if (state === 'expired') {
    return (
      <div className="shared-view-container">
        <div className="shared-view-card">
          <AlertTriangle className="shared-view-error-icon" />
          <h2>Share Link Expired</h2>
          <p>This share link has expired and is no longer accessible.</p>
        </div>
      </div>
    );
  }

  // Documents state — show documents directly
  return (
    <div className="shared-view-container">
      <div className="shared-view-card shared-view-card-wide">
        <CheckCircle2 className="shared-view-success-icon" />
        <h2>Shared Documents</h2>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14, marginBottom: 16 }}>
          <strong>{senderName}</strong> has shared {documents.length} document(s) with you via TAXBEBO.
          {expiresAt && <> Access expires {new Date(expiresAt).toLocaleDateString()}.</>}
        </p>
        {error && <p className="shared-view-error">{error}</p>}
        <div className="shared-view-documents">
          {documents.map((doc) => {
            const permRevoked = doc.isDriveFile && doc.drivePermissionActive === false;

            return (
              <div key={doc.id} className={`shared-view-doc-item ${permRevoked ? 'shared-view-doc-revoked' : ''}`}>
                <FileText className="shared-view-doc-icon" />
                <div className="shared-view-doc-info">
                  <span className="shared-view-doc-name">{doc.fileName}</span>
                  <span className="shared-view-doc-meta">
                    {doc.mainCategory?.replace(/_/g, ' ')}
                    {doc.subCategory ? ` • ${doc.subCategory.replace(/_/g, ' ')}` : ''}
                    {doc.isDriveFile && (
                      <span className="shared-view-drive-badge"> • Google Drive</span>
                    )}
                  </span>
                  {permRevoked && (
                    <span className="shared-view-perm-revoked">
                      <ShieldAlert className="h-3 w-3" />
                      Access revoked by owner
                    </span>
                  )}
                </div>
                <div className="shared-view-doc-actions">
                  <Button
                    size="sm"
                    disabled={loadingDocId === doc.id || permRevoked}
                    onClick={() => handleDownload(doc)}
                  >
                    {loadingDocId === doc.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><Download className="h-4 w-4 mr-1" /> {doc.isDriveFile ? 'Open' : 'Download'}</>}
                  </Button>
                </div>
              </div>
            );
          })}
          {documents.length === 0 && (
            <p className="shared-view-no-docs">No accessible documents found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
