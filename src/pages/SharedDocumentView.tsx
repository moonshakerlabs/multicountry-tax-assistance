import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Download, Lock, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import './SharedDocumentView.css';

interface SharedDocument {
  id: string;
  fileName: string;
  fileType: string;
  mainCategory: string;
  subCategory: string;
}

type ViewState = 'loading' | 'invalid' | 'expired' | 'email-entry' | 'otp-sent' | 'verified';

export default function SharedDocumentView() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewState>('loading');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [allowDownload, setAllowDownload] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
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
        setDocumentCount(data.documentCount);
        setExpiresAt(data.expiresAt);
        setAllowDownload(data.allowDownload);
        setState('email-entry');
      }
    }).catch(() => setState('invalid'));
  }, [token, callFunction]);

  const handleSendOtp = async () => {
    if (!email) return;
    setIsSubmitting(true);
    setError('');
    try {
      const data = await callFunction({ action: 'send-otp', token, email });
      if (data.error) setError(data.error);
      else setState('otp-sent');
    } catch {
      setError('Failed to send verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setIsSubmitting(true);
    setError('');
    try {
      const data = await callFunction({ action: 'verify-otp', token, email, otp });
      if (data.error) {
        setError(data.error);
      } else {
        setDocuments(data.documents || []);
        setAllowDownload(data.allowDownload);
        setAccessToken(data.accessToken);
        setState('verified');
      }
    } catch {
      setError('Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch a fresh signed URL on demand — never stale
  const getFreshSignedUrl = async (documentId: string): Promise<string | null> => {
    if (!accessToken) return null;
    try {
      const data = await callFunction({ action: 'get-url', token, accessToken, documentId });
      return data.signedUrl || null;
    } catch {
      return null;
    }
  };

  const handleView = async (doc: SharedDocument) => {
    setLoadingDocId(doc.id);
    try {
      const url = await getFreshSignedUrl(doc.id);
      if (url) window.open(url, '_blank');
      else setError('Could not load document. Please try again.');
    } finally {
      setLoadingDocId(null);
    }
  };

  const handleDownload = async (doc: SharedDocument) => {
    if (!allowDownload) return;
    setLoadingDocId(doc.id + '-dl');
    try {
      const url = await getFreshSignedUrl(doc.id);
      if (!url) { setError('Could not download document. Please try again.'); return; }
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setLoadingDocId(null);
    }
  };

  if (state === 'loading') {
    return (
      <div className="shared-view-container">
        <div className="shared-view-card">
          <Loader2 className="shared-view-spinner" />
          <p>Validating share link...</p>
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

  if (state === 'email-entry') {
    return (
      <div className="shared-view-container">
        <div className="shared-view-card">
          <Lock className="shared-view-lock-icon" />
          <h2>Secure Document Access</h2>
          <p className="shared-view-info">
            {documentCount} document(s) shared with you. Access expires {new Date(expiresAt).toLocaleDateString()}.
          </p>
          <p className="shared-view-hint">Enter your email to receive a verification code.</p>
          {error && <p className="shared-view-error">{error}</p>}
          <div className="shared-view-input-group">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
            />
            <Button onClick={handleSendOtp} disabled={isSubmitting || !email}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Code'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'otp-sent') {
    return (
      <div className="shared-view-container">
        <div className="shared-view-card">
          <Lock className="shared-view-lock-icon" />
          <h2>Enter Verification Code</h2>
          <p className="shared-view-hint">
            A verification code has been sent to <strong>{email}</strong>.
          </p>
          {error && <p className="shared-view-error">{error}</p>}
          <div className="shared-view-input-group">
            <Input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
            />
            <Button onClick={handleVerifyOtp} disabled={isSubmitting || !otp}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
            </Button>
          </div>
          <button className="shared-view-resend" onClick={handleSendOtp}>
            Resend code
          </button>
        </div>
      </div>
    );
  }

  // Verified state
  return (
    <div className="shared-view-container">
      <div className="shared-view-card shared-view-card-wide">
        <CheckCircle2 className="shared-view-success-icon" />
        <h2>Shared Documents</h2>
        {error && <p className="shared-view-error">{error}</p>}
        <div className="shared-view-documents">
          {documents.map((doc) => (
            <div key={doc.id} className="shared-view-doc-item">
              <FileText className="shared-view-doc-icon" />
              <div className="shared-view-doc-info">
                <span className="shared-view-doc-name">{doc.fileName}</span>
                <span className="shared-view-doc-meta">
                  {doc.mainCategory?.replace(/_/g, ' ')}
                  {doc.subCategory ? ` • ${doc.subCategory.replace(/_/g, ' ')}` : ''}
                </span>
              </div>
              <div className="shared-view-doc-actions">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingDocId === doc.id}
                  onClick={() => handleView(doc)}
                >
                  {loadingDocId === doc.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : 'View'}
                </Button>
                {allowDownload && (
                  <Button
                    size="sm"
                    disabled={loadingDocId === doc.id + '-dl'}
                    onClick={() => handleDownload(doc)}
                  >
                    {loadingDocId === doc.id + '-dl'
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Download className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <p className="shared-view-no-docs">No accessible documents found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
