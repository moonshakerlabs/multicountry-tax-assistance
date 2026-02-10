import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { X, Send, Link2, Loader2 } from 'lucide-react';
import './ShareModal.css';

interface ShareModalProps {
  documentIds: string[];
  isDE: boolean;
  onClose: () => void;
  onShareComplete: () => void;
}

const RECIPIENT_TYPES = [
  { value: 'CA', labelEn: 'Chartered Accountant', labelDe: 'Steuerberater' },
  { value: 'Family', labelEn: 'Family', labelDe: 'Familie' },
  { value: 'Other', labelEn: 'Other', labelDe: 'Andere' },
];

const CA_COUNTRIES = [
  { value: 'DE', label: 'Germany' },
  { value: 'IN', label: 'India' },
  { value: 'AE', label: 'UAE' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
];

const FAMILY_RELATIONS = [
  { value: 'Father', labelEn: 'Father', labelDe: 'Vater' },
  { value: 'Mother', labelEn: 'Mother', labelDe: 'Mutter' },
  { value: 'Spouse', labelEn: 'Spouse', labelDe: 'Ehepartner' },
  { value: 'Child', labelEn: 'Child', labelDe: 'Kind' },
  { value: 'Sibling', labelEn: 'Sibling', labelDe: 'Geschwister' },
  { value: 'Other', labelEn: 'Other', labelDe: 'Andere' },
];

export default function ShareModal({ documentIds, isDE, onClose, onShareComplete }: ShareModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [recipientType, setRecipientType] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [allowDownload, setAllowDownload] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [caCountry, setCaCountry] = useState('');
  const [familyRelation, setFamilyRelation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const handleSubmit = async () => {
    if (!recipientType || !recipientEmail || !expiresAt) {
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: isDE ? 'Bitte alle Pflichtfelder ausfüllen.' : 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const recipientMetadata: Record<string, string> = {};
    if (recipientType === 'CA' && caCountry) {
      recipientMetadata.country = caCountry;
    }
    if (recipientType === 'Family' && familyRelation) {
      recipientMetadata.relationship = familyRelation;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('send-share-email', {
        body: {
          documentIds,
          recipientEmail,
          recipientType,
          recipientMetadata,
          allowDownload,
          expiresAt: new Date(expiresAt).toISOString(),
        },
      });

      if (response.error) throw new Error(response.error.message);

      const result = response.data;
      if (result.status === 'SUCCESS') {
        setShareLink(result.shareLink);
        toast({
          title: isDE ? 'Freigabe erstellt' : 'Share created',
          description: isDE ? 'E-Mail wurde gesendet.' : 'Email has been sent.',
        });
        onShareComplete();
      } else {
        throw new Error('Email delivery failed');
      }
    } catch (error: any) {
      console.error('Share error:', error);
      toast({
        title: isDE ? 'Fehler' : 'Error',
        description: error.message || (isDE ? 'Freigabe fehlgeschlagen.' : 'Share failed.'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: isDE ? 'Kopiert' : 'Copied',
      description: isDE ? 'Link in die Zwischenablage kopiert.' : 'Link copied to clipboard.',
    });
  };

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2 className="share-modal-title">
            {isDE ? 'Dokumente teilen' : 'Share Documents'}
          </h2>
          <span className="share-modal-count">
            {documentIds.length} {isDE ? 'Dokument(e)' : 'document(s)'}
          </span>
          <button className="share-modal-close" onClick={onClose}>
            <X className="share-modal-close-icon" />
          </button>
        </div>

        {shareLink ? (
          <div className="share-modal-success">
            <div className="share-modal-success-icon">✅</div>
            <p className="share-modal-success-text">
              {isDE ? 'Freigabelink erstellt und E-Mail gesendet!' : 'Share link created and email sent!'}
            </p>
            <div className="share-modal-link-box">
              <Input value={shareLink} readOnly className="share-modal-link-input" />
              <Button onClick={copyLink} size="sm" variant="outline">
                <Link2 className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={onClose} className="share-modal-done-btn">
              {isDE ? 'Fertig' : 'Done'}
            </Button>
          </div>
        ) : (
          <div className="share-modal-form">
            {/* Recipient Type */}
            <div className="share-field">
              <label className="share-label">
                {isDE ? 'Empfängertyp' : 'Recipient Type'} *
              </label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value)}
                className="share-select"
              >
                <option value="">{isDE ? 'Auswählen...' : 'Select...'}</option>
                {RECIPIENT_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {isDE ? rt.labelDe : rt.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* CA Country */}
            {recipientType === 'CA' && (
              <div className="share-field">
                <label className="share-label">
                  {isDE ? 'Land' : 'Country'}
                </label>
                <select
                  value={caCountry}
                  onChange={(e) => setCaCountry(e.target.value)}
                  className="share-select"
                >
                  <option value="">{isDE ? 'Auswählen...' : 'Select...'}</option>
                  {CA_COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Family Relationship */}
            {recipientType === 'Family' && (
              <div className="share-field">
                <label className="share-label">
                  {isDE ? 'Beziehung' : 'Relationship'}
                </label>
                <select
                  value={familyRelation}
                  onChange={(e) => setFamilyRelation(e.target.value)}
                  className="share-select"
                >
                  <option value="">{isDE ? 'Auswählen...' : 'Select...'}</option>
                  {FAMILY_RELATIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {isDE ? r.labelDe : r.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Recipient Email */}
            <div className="share-field">
              <label className="share-label">
                {isDE ? 'E-Mail-Adresse' : 'Recipient Email'} *
              </label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder={isDE ? 'empfaenger@beispiel.de' : 'recipient@example.com'}
                className="share-input"
              />
            </div>

            {/* Allow Download */}
            <div className="share-field share-field-toggle">
              <label className="share-label">
                {isDE ? 'Download erlauben' : 'Allow Download'}
              </label>
              <button
                type="button"
                className={`share-toggle ${allowDownload ? 'share-toggle-on' : ''}`}
                onClick={() => setAllowDownload(!allowDownload)}
              >
                <span className="share-toggle-knob" />
              </button>
            </div>

            {/* Expiry Date */}
            <div className="share-field">
              <label className="share-label">
                {isDE ? 'Gültig bis' : 'Access Valid Till'} *
              </label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={minDate}
                className="share-input"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="share-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isDE ? 'Wird erstellt...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isDE ? 'Freigabelink erstellen' : 'Generate Share Link'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
