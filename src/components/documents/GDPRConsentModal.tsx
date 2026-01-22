import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, FileText, Lock, Server } from 'lucide-react';
import './GDPRConsentModal.css';

interface GDPRConsentModalProps {
  isDE: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function GDPRConsentModal({
  isDE,
  onAccept,
  onDecline
}: GDPRConsentModalProps) {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  const canProceed = hasReadTerms && hasAcceptedTerms;

  return (
    <div className="gdpr-modal-overlay" onClick={onDecline}>
      <div className="gdpr-modal" onClick={e => e.stopPropagation()}>
        <div className="gdpr-modal-header">
          <div className="gdpr-modal-icon">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="gdpr-modal-title">
            {isDE ? 'Datenschutz & GDPR-Einwilligung' : 'Data Protection & GDPR Consent'}
          </h2>
        </div>

        <div className="gdpr-content">
          <p className="gdpr-intro">
            {isDE 
              ? 'Um Ihre Dokumente sicher auf unseren Servern zu speichern, benötigen wir Ihre Einwilligung gemäß der Datenschutz-Grundverordnung (DSGVO/GDPR).'
              : 'To securely store your documents on our servers, we require your consent in accordance with the General Data Protection Regulation (GDPR).'}
          </p>

          <div className="gdpr-sections">
            <div className="gdpr-section">
              <div className="gdpr-section-icon">
                <Server className="w-5 h-5" />
              </div>
              <div className="gdpr-section-content">
                <h3>{isDE ? 'Datenspeicherung' : 'Data Storage'}</h3>
                <p>
                  {isDE 
                    ? 'Ihre Dokumente werden auf sicheren Servern innerhalb der Europäischen Union gespeichert.'
                    : 'Your documents are stored on secure servers within the European Union.'}
                </p>
              </div>
            </div>

            <div className="gdpr-section">
              <div className="gdpr-section-icon">
                <Lock className="w-5 h-5" />
              </div>
              <div className="gdpr-section-content">
                <h3>{isDE ? 'Verschlüsselung' : 'Encryption'}</h3>
                <p>
                  {isDE 
                    ? 'Alle Dokumente werden bei der Übertragung und Speicherung mit AES-256 verschlüsselt.'
                    : 'All documents are encrypted using AES-256 during transmission and storage.'}
                </p>
              </div>
            </div>

            <div className="gdpr-section">
              <div className="gdpr-section-icon">
                <FileText className="w-5 h-5" />
              </div>
              <div className="gdpr-section-content">
                <h3>{isDE ? 'Ihre Rechte' : 'Your Rights'}</h3>
                <p>
                  {isDE 
                    ? 'Sie können jederzeit Ihre Daten einsehen, herunterladen oder löschen lassen. Sie haben das Recht auf Datenportabilität.'
                    : 'You can view, download, or delete your data at any time. You have the right to data portability.'}
                </p>
              </div>
            </div>
          </div>

          <div className="gdpr-terms-box">
            <h4>{isDE ? 'Nutzungsbedingungen' : 'Terms of Service'}</h4>
            <div className="gdpr-terms-content">
              <p>
                {isDE ? (
                  <>
                    <strong>1. Zweck der Datenverarbeitung</strong><br />
                    Wir verarbeiten Ihre hochgeladenen Dokumente ausschließlich zum Zweck der sicheren Speicherung und Bereitstellung für Ihre Steuererklärung.<br /><br />
                    
                    <strong>2. Rechtsgrundlage</strong><br />
                    Die Verarbeitung erfolgt auf Grundlage Ihrer Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO.<br /><br />
                    
                    <strong>3. Speicherdauer</strong><br />
                    Ihre Dokumente werden gespeichert, bis Sie diese löschen oder Ihr Konto deaktivieren.<br /><br />
                    
                    <strong>4. Datensicherheit</strong><br />
                    Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten zu schützen.<br /><br />
                    
                    <strong>5. Widerruf</strong><br />
                    Sie können Ihre Einwilligung jederzeit in den Profileinstellungen widerrufen.
                  </>
                ) : (
                  <>
                    <strong>1. Purpose of Data Processing</strong><br />
                    We process your uploaded documents solely for the purpose of secure storage and provision for your tax declaration.<br /><br />
                    
                    <strong>2. Legal Basis</strong><br />
                    Processing is based on your consent pursuant to Art. 6(1)(a) GDPR.<br /><br />
                    
                    <strong>3. Storage Duration</strong><br />
                    Your documents are stored until you delete them or deactivate your account.<br /><br />
                    
                    <strong>4. Data Security</strong><br />
                    We implement technical and organizational measures to protect your data.<br /><br />
                    
                    <strong>5. Withdrawal</strong><br />
                    You can withdraw your consent at any time in your profile settings.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="gdpr-checkboxes">
            <div className="gdpr-checkbox-row">
              <Checkbox 
                id="read-terms"
                checked={hasReadTerms}
                onCheckedChange={(checked) => setHasReadTerms(checked === true)}
              />
              <label htmlFor="read-terms" className="gdpr-checkbox-label">
                {isDE 
                  ? 'Ich habe die Nutzungsbedingungen gelesen und verstanden.'
                  : 'I have read and understood the terms of service.'}
              </label>
            </div>
            <div className="gdpr-checkbox-row">
              <Checkbox 
                id="accept-terms"
                checked={hasAcceptedTerms}
                onCheckedChange={(checked) => setHasAcceptedTerms(checked === true)}
              />
              <label htmlFor="accept-terms" className="gdpr-checkbox-label">
                {isDE 
                  ? 'Ich stimme der Speicherung meiner Dokumente gemäß DSGVO zu.'
                  : 'I consent to the storage of my documents in accordance with GDPR.'}
              </label>
            </div>
          </div>
        </div>

        <div className="gdpr-modal-actions">
          <Button variant="outline" onClick={onDecline}>
            {isDE ? 'Ablehnen' : 'Decline'}
          </Button>
          <Button 
            onClick={onAccept}
            disabled={!canProceed}
          >
            {isDE ? 'Zustimmen & Fortfahren' : 'Agree & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
