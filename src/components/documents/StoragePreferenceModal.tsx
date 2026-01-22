import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cloud, HardDrive, AlertCircle, CheckCircle2 } from 'lucide-react';
import './StoragePreferenceModal.css';

interface StoragePreferenceModalProps {
  isDE: boolean;
  onSelectSaaS: () => void;
  onSelectGoogleDrive: () => void;
  onClose: () => void;
}

export default function StoragePreferenceModal({
  isDE,
  onSelectSaaS,
  onSelectGoogleDrive,
  onClose
}: StoragePreferenceModalProps) {
  const [selectedOption, setSelectedOption] = useState<'saas' | 'google_drive' | null>(null);

  const handleContinue = () => {
    if (selectedOption === 'saas') {
      onSelectSaaS();
    } else if (selectedOption === 'google_drive') {
      onSelectGoogleDrive();
    }
  };

  return (
    <div className="storage-modal-overlay" onClick={onClose}>
      <div className="storage-modal" onClick={e => e.stopPropagation()}>
        <div className="storage-modal-header">
          <h2 className="storage-modal-title">
            {isDE ? 'Speicherort wählen' : 'Choose Storage Location'}
          </h2>
          <p className="storage-modal-subtitle">
            {isDE 
              ? 'Wo möchten Sie Ihre Dokumente speichern? Diese Einstellung kann später in den Profileinstellungen geändert werden.'
              : 'Where would you like to store your documents? This setting can be changed later in your profile settings.'}
          </p>
        </div>

        <div className="storage-options">
          {/* SaaS Option */}
          <div 
            className={`storage-option ${selectedOption === 'saas' ? 'storage-option-selected' : ''}`}
            onClick={() => setSelectedOption('saas')}
          >
            <div className="storage-option-icon">
              <Cloud className="w-8 h-8" />
            </div>
            <div className="storage-option-content">
              <h3 className="storage-option-title">
                {isDE ? 'Plattform-Speicher' : 'Platform Storage'}
              </h3>
              <p className="storage-option-description">
                {isDE 
                  ? 'Sichere Speicherung auf unseren GDPR-konformen Servern in der EU.'
                  : 'Secure storage on our GDPR-compliant servers in the EU.'}
              </p>
              <ul className="storage-option-features">
                <li><CheckCircle2 className="w-4 h-4" /> {isDE ? 'GDPR-konform' : 'GDPR compliant'}</li>
                <li><CheckCircle2 className="w-4 h-4" /> {isDE ? 'Verschlüsselt' : 'Encrypted'}</li>
                <li><CheckCircle2 className="w-4 h-4" /> {isDE ? 'Automatische Backups' : 'Automatic backups'}</li>
              </ul>
            </div>
            {selectedOption === 'saas' && (
              <div className="storage-option-check">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Google Drive Option */}
          <div 
            className={`storage-option ${selectedOption === 'google_drive' ? 'storage-option-selected' : ''}`}
            onClick={() => setSelectedOption('google_drive')}
          >
            <div className="storage-option-icon storage-option-icon-google">
              <HardDrive className="w-8 h-8" />
            </div>
            <div className="storage-option-content">
              <h3 className="storage-option-title">
                {isDE ? 'Ihr Google Drive' : 'Your Google Drive'}
              </h3>
              <p className="storage-option-description">
                {isDE 
                  ? 'Dokumente direkt in Ihrem Google Drive speichern.'
                  : 'Store documents directly in your Google Drive.'}
              </p>
              <ul className="storage-option-features">
                <li><CheckCircle2 className="w-4 h-4" /> {isDE ? 'Volle Kontrolle' : 'Full control'}</li>
                <li><CheckCircle2 className="w-4 h-4" /> {isDE ? 'Ihre Daten' : 'Your data'}</li>
                <li><CheckCircle2 className="w-4 h-4" /> {isDE ? 'Google-Sicherheit' : 'Google security'}</li>
              </ul>
              <div className="storage-option-note">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {isDE 
                    ? 'Mindestens 500 MB freier Speicher erforderlich'
                    : 'Minimum 500 MB free space required'}
                </span>
              </div>
            </div>
            {selectedOption === 'google_drive' && (
              <div className="storage-option-check">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>

        <div className="storage-modal-actions">
          <Button variant="outline" onClick={onClose}>
            {isDE ? 'Abbrechen' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedOption}
          >
            {isDE ? 'Weiter' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
