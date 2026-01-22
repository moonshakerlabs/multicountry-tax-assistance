import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HardDrive, AlertCircle, CheckCircle2, Loader2, FolderOpen, RefreshCw } from 'lucide-react';
import './GoogleDriveSetupModal.css';

type SetupStep = 'connecting' | 'checking_storage' | 'creating_folders' | 'complete' | 'error' | 'insufficient_storage';

interface GoogleDriveSetupModalProps {
  isDE: boolean;
  onComplete: (folderId: string) => void;
  onCancel: () => void;
  userEmail?: string;
  usedGoogleSignIn?: boolean;
}

// Minimum required storage in bytes (500 MB)
const MIN_REQUIRED_STORAGE_BYTES = 500 * 1024 * 1024;

export default function GoogleDriveSetupModal({
  isDE,
  onComplete,
  onCancel,
  userEmail,
  usedGoogleSignIn = false
}: GoogleDriveSetupModalProps) {
  const [step, setStep] = useState<SetupStep>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [availableStorage, setAvailableStorage] = useState<number>(0);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Google OAuth Client ID - This would be configured in your Google Cloud Console
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    // Initialize Google API
    initGoogleAPI();
  }, []);

  const initGoogleAPI = async () => {
    try {
      // Load the Google API client library
      if (!window.gapi) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => loadGapiClient();
        document.body.appendChild(script);
      } else {
        loadGapiClient();
      }
    } catch (error) {
      console.error('Error initializing Google API:', error);
      setErrorMessage(isDE 
        ? 'Google API konnte nicht geladen werden.' 
        : 'Failed to load Google API.');
      setStep('error');
    }
  };

  const loadGapiClient = () => {
    window.gapi.load('client:auth2', async () => {
      try {
        // Check if we have a valid client ID
        if (!GOOGLE_CLIENT_ID) {
          setErrorMessage(isDE 
            ? 'Google Drive Integration ist noch nicht konfiguriert. Bitte kontaktieren Sie den Support.' 
            : 'Google Drive integration is not yet configured. Please contact support.');
          setStep('error');
          return;
        }

        await window.gapi.client.init({
          clientId: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file',
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        
        // Check if user is already signed in
        const authInstance = window.gapi.auth2.getAuthInstance();
        if (authInstance.isSignedIn.get()) {
          const token = authInstance.currentUser.get().getAuthResponse().access_token;
          setAccessToken(token);
          checkStorageQuota(token);
        } else {
          // Wait for user action to sign in
          setStep('connecting');
        }
      } catch (error) {
        console.error('Error initializing gapi client:', error);
        setErrorMessage(isDE 
          ? 'Verbindung zu Google Drive fehlgeschlagen.' 
          : 'Failed to connect to Google Drive.');
        setStep('error');
      }
    });
  };

  const handleGoogleSignIn = async () => {
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      const token = user.getAuthResponse().access_token;
      setAccessToken(token);
      await checkStorageQuota(token);
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      if (error.error === 'popup_closed_by_user') {
        // User closed the popup, don't show error
        return;
      }
      setErrorMessage(isDE 
        ? 'Google-Anmeldung fehlgeschlagen.' 
        : 'Google sign-in failed.');
      setStep('error');
    }
  };

  const checkStorageQuota = async (token: string) => {
    setStep('checking_storage');
    
    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch storage quota');
      }

      const data = await response.json();
      const quota = data.storageQuota;
      
      // Calculate available storage
      const limit = parseInt(quota.limit) || Number.MAX_SAFE_INTEGER;
      const usage = parseInt(quota.usage) || 0;
      const available = limit - usage;
      
      setAvailableStorage(available);

      if (available < MIN_REQUIRED_STORAGE_BYTES) {
        setStep('insufficient_storage');
      } else {
        await createFolderStructure(token);
      }
    } catch (error) {
      console.error('Error checking storage:', error);
      setErrorMessage(isDE 
        ? 'Speicherplatz konnte nicht überprüft werden.' 
        : 'Could not check storage space.');
      setStep('error');
    }
  };

  const createFolderStructure = async (token: string) => {
    setStep('creating_folders');
    
    try {
      // Check if master folder already exists
      const existingFolder = await findFolder(token, 'TaxDocumentVault', 'root');
      
      let masterFolderId: string;
      
      if (existingFolder) {
        masterFolderId = existingFolder;
      } else {
        // Create master folder
        masterFolderId = await createFolder(token, 'TaxDocumentVault', 'root');
      }

      setStep('complete');
      
      // Small delay before completing to show success state
      setTimeout(() => {
        onComplete(masterFolderId);
      }, 1500);

    } catch (error) {
      console.error('Error creating folders:', error);
      setErrorMessage(isDE 
        ? 'Ordner konnte nicht erstellt werden.' 
        : 'Could not create folder.');
      setStep('error');
    }
  };

  const findFolder = async (token: string, name: string, parent: string): Promise<string | null> => {
    const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and trashed=false`;
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search for folder');
    }

    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  };

  const createFolder = async (token: string, name: string, parent: string): Promise<string> => {
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parent],
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create folder');
    }

    const data = await response.json();
    return data.id;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const renderContent = () => {
    switch (step) {
      case 'connecting':
        return (
          <div className="gdrive-setup-content">
            <div className="gdrive-setup-icon">
              <HardDrive className="w-12 h-12" />
            </div>
            <h3>{isDE ? 'Mit Google Drive verbinden' : 'Connect to Google Drive'}</h3>
            <p>
              {usedGoogleSignIn 
                ? (isDE 
                    ? 'Klicken Sie unten, um den Zugriff auf Ihren Google Drive zu autorisieren.'
                    : 'Click below to authorize access to your Google Drive.')
                : (isDE 
                    ? 'Melden Sie sich mit Ihrem Google-Konto an, um fortzufahren.'
                    : 'Sign in with your Google account to continue.')}
            </p>
            <Button onClick={handleGoogleSignIn} className="gdrive-connect-btn">
              <HardDrive className="w-5 h-5 mr-2" />
              {isDE ? 'Mit Google Drive verbinden' : 'Connect to Google Drive'}
            </Button>
          </div>
        );

      case 'checking_storage':
        return (
          <div className="gdrive-setup-content gdrive-setup-loading">
            <Loader2 className="w-12 h-12 animate-spin" />
            <h3>{isDE ? 'Speicherplatz wird überprüft...' : 'Checking storage space...'}</h3>
            <p>{isDE ? 'Bitte warten Sie einen Moment.' : 'Please wait a moment.'}</p>
          </div>
        );

      case 'creating_folders':
        return (
          <div className="gdrive-setup-content gdrive-setup-loading">
            <FolderOpen className="w-12 h-12 animate-pulse" />
            <h3>{isDE ? 'Ordner werden erstellt...' : 'Creating folders...'}</h3>
            <p>{isDE ? 'Ihre Ordnerstruktur wird eingerichtet.' : 'Setting up your folder structure.'}</p>
          </div>
        );

      case 'complete':
        return (
          <div className="gdrive-setup-content gdrive-setup-success">
            <CheckCircle2 className="w-12 h-12" />
            <h3>{isDE ? 'Erfolgreich verbunden!' : 'Successfully connected!'}</h3>
            <p>{isDE ? 'Ihr Google Drive ist bereit.' : 'Your Google Drive is ready.'}</p>
          </div>
        );

      case 'insufficient_storage':
        return (
          <div className="gdrive-setup-content gdrive-setup-warning">
            <AlertCircle className="w-12 h-12" />
            <h3>{isDE ? 'Unzureichender Speicherplatz' : 'Insufficient Storage Space'}</h3>
            <p>
              {isDE 
                ? `Ihr Google Drive hat nur ${formatBytes(availableStorage)} freien Speicher. Mindestens 500 MB werden benötigt.`
                : `Your Google Drive only has ${formatBytes(availableStorage)} available. Minimum 500 MB is required.`}
            </p>
            <div className="gdrive-storage-info">
              <span>{isDE ? 'Verfügbar:' : 'Available:'}</span>
              <span className="gdrive-storage-value">{formatBytes(availableStorage)}</span>
              <span className="gdrive-storage-required">
                {isDE ? '(mindestens 500 MB erforderlich)' : '(minimum 500 MB required)'}
              </span>
            </div>
            <Button variant="outline" onClick={() => checkStorageQuota(accessToken!)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {isDE ? 'Erneut prüfen' : 'Check again'}
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="gdrive-setup-content gdrive-setup-error">
            <AlertCircle className="w-12 h-12" />
            <h3>{isDE ? 'Verbindungsfehler' : 'Connection Error'}</h3>
            <p>{errorMessage}</p>
            <Button variant="outline" onClick={() => setStep('connecting')}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {isDE ? 'Erneut versuchen' : 'Try again'}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="gdrive-modal-overlay" onClick={onCancel}>
      <div className="gdrive-modal" onClick={e => e.stopPropagation()}>
        <div className="gdrive-modal-header">
          <h2>{isDE ? 'Google Drive einrichten' : 'Set Up Google Drive'}</h2>
        </div>

        {renderContent()}

        <div className="gdrive-modal-footer">
          <div className="gdrive-storage-note">
            <AlertCircle className="w-4 h-4" />
            <span>
              {isDE 
                ? 'Mindestens 500 MB freier Speicher erforderlich'
                : 'Minimum 500 MB free space required'}
            </span>
          </div>
          {(step === 'connecting' || step === 'insufficient_storage' || step === 'error') && (
            <Button variant="ghost" onClick={onCancel}>
              {isDE ? 'Abbrechen' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Add gapi types
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: any) => Promise<void>;
        drive: {
          files: {
            create: (params: any) => Promise<any>;
            list: (params: any) => Promise<any>;
          };
          about: {
            get: (params: any) => Promise<any>;
          };
        };
      };
      auth2: {
        getAuthInstance: () => {
          isSignedIn: { get: () => boolean };
          signIn: () => Promise<any>;
          currentUser: {
            get: () => {
              getAuthResponse: () => { access_token: string };
            };
          };
        };
      };
    };
  }
}
