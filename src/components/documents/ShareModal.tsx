import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { X, Send, Link2, Loader2, Plus, Trash2 } from 'lucide-react';
import './ShareModal.css';

interface ShareModalProps {
  documentIds: string[];
  isDE: boolean;
  onClose: () => void;
  onShareComplete: () => void;
}

const RECIPIENT_TYPES = [
  { value: 'ca', labelEn: 'Chartered Accountant', labelDe: 'Steuerberater' },
  { value: 'family', labelEn: 'Family', labelDe: 'Familie' },
  { value: 'other', labelEn: 'Other', labelDe: 'Andere' },
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
  { value: 'Friend', labelEn: 'Friend', labelDe: 'Freund/Freundin' },
  { value: 'Other', labelEn: 'Other', labelDe: 'Andere' },
];

interface RecipientEntry {
  email: string;
  type: string;
  caCountry: string;
  familyRelation: string;
}

const emptyRecipient = (): RecipientEntry => ({
  email: '',
  type: '',
  caCountry: '',
  familyRelation: '',
});

export default function ShareModal({ documentIds, isDE, onClose, onShareComplete }: ShareModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [recipients, setRecipients] = useState<RecipientEntry[]>([emptyRecipient()]);
  const [allowDownload, setAllowDownload] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareLinks, setShareLinks] = useState<Array<{ email: string; link: string; status: string }>>([]);

  const updateRecipient = (index: number, field: keyof RecipientEntry, value: string) => {
    setRecipients(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Reset metadata fields when type changes
      if (field === 'type') {
        next[index].caCountry = '';
        next[index].familyRelation = '';
      }
      return next;
    });
  };

  const addRecipient = () => {
    setRecipients(prev => [...prev, emptyRecipient()]);
  };

  const removeRecipient = (index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validate
    for (const r of recipients) {
      if (!r.type || !r.email || !expiresAt) {
        toast({
          title: isDE ? 'Fehler' : 'Error',
          description: isDE ? 'Bitte alle Pflichtfelder ausfüllen.' : 'Please fill in all required fields for every recipient.',
          variant: 'destructive',
        });
        return;
      }
      if (!r.email.includes('@')) {
        toast({
          title: isDE ? 'Fehler' : 'Error',
          description: isDE ? `Ungültige E-Mail: ${r.email}` : `Invalid email: ${r.email}`,
          variant: 'destructive',
        });
        return;
      }
    }

    const recipientsPayload = recipients.map(r => {
      const metadata: Record<string, string> = {};
      if (r.type === 'ca' && r.caCountry) metadata.country = r.caCountry;
      if (r.type === 'family' && r.familyRelation) metadata.relationship = r.familyRelation;
      return { email: r.email.trim(), type: r.type, metadata };
    });

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('send-share-email', {
        body: {
          documentIds,
          recipients: recipientsPayload,
          allowDownload,
          expiresAt: new Date(expiresAt + 'T23:59:59').toISOString(),
        },
      });

      if (response.error) throw new Error(response.error.message);

      const result = response.data;
      const links = (result.results || []).map((r: any) => ({
        email: r.email,
        link: r.shareLink,
        status: r.status,
      }));
      setShareLinks(links);

      const successCount = links.filter((r: any) => r.status === 'SUCCESS').length;
      const failCount = links.length - successCount;

      toast({
        title: isDE ? 'Dokumente geteilt' : 'Documents mailed',
        description: isDE
          ? `${successCount} E-Mail(s) gesendet${failCount > 0 ? `, ${failCount} fehlgeschlagen` : ''}.`
          : `${successCount} email(s) sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        variant: failCount > 0 && successCount === 0 ? 'destructive' : 'default',
      });

      if (successCount > 0) onShareComplete();
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

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
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
            {isDE ? 'Dokumente per E-Mail senden' : 'Mail Documents to Recipient(s)'}
          </h2>
          <span className="share-modal-count">
            {documentIds.length} {isDE ? 'Dokument(e)' : 'document(s)'}
          </span>
          <button className="share-modal-close" onClick={onClose}>
            <X className="share-modal-close-icon" />
          </button>
        </div>

        {shareLinks.length > 0 ? (
          <div className="share-modal-success">
            <div className="share-modal-success-icon">✅</div>
            <p className="share-modal-success-text">
              {isDE ? 'Dokumente erfolgreich geteilt!' : 'Documents mailed successfully!'}
            </p>
            <div className="share-results-list">
              {shareLinks.map((r, i) => (
                <div key={i} className={`share-result-item ${r.status === 'SUCCESS' ? 'share-result-success' : 'share-result-failed'}`}>
                  <div className="share-result-email">
                    <span className={`share-result-status-dot ${r.status === 'SUCCESS' ? 'dot-success' : 'dot-failed'}`} />
                    <span>{r.email}</span>
                    <span className="share-result-status-label">{r.status === 'SUCCESS' ? (isDE ? 'Gesendet' : 'Sent') : (isDE ? 'Fehlgeschlagen' : 'Failed')}</span>
                  </div>
                  {r.status === 'SUCCESS' && r.link && (
                    <div className="share-modal-link-box">
                      <Input value={r.link} readOnly className="share-modal-link-input" />
                      <Button onClick={() => copyLink(r.link)} size="sm" variant="outline">
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={onClose} className="share-modal-done-btn">
              {isDE ? 'Fertig' : 'Done'}
            </Button>
          </div>
        ) : (
          <div className="share-modal-form">
            {/* Recipients */}
            <div className="share-recipients-section">
              <div className="share-recipients-header">
                <label className="share-label">{isDE ? 'Empfänger' : 'Recipients'} *</label>
                <button className="share-add-recipient-btn" onClick={addRecipient} type="button">
                  <Plus className="h-3 w-3" />
                  {isDE ? 'Weiterer Empfänger' : 'Add Recipient'}
                </button>
              </div>

              {recipients.map((r, index) => (
                <div key={index} className="share-recipient-card">
                  {recipients.length > 1 && (
                    <div className="share-recipient-card-header">
                      <span className="share-recipient-number">
                        {isDE ? `Empfänger ${index + 1}` : `Recipient ${index + 1}`}
                      </span>
                      <button
                        className="share-remove-recipient-btn"
                        onClick={() => removeRecipient(index)}
                        type="button"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Email */}
                  <div className="share-field">
                    <label className="share-label-sm">
                      {isDE ? 'E-Mail-Adresse' : 'Email Address'} *
                    </label>
                    <Input
                      type="email"
                      value={r.email}
                      onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                      placeholder={isDE ? 'empfaenger@beispiel.de' : 'recipient@example.com'}
                      className="share-input"
                    />
                  </div>

                  {/* Relationship / Type */}
                  <div className="share-field">
                    <label className="share-label-sm">
                      {isDE ? 'Beziehung' : 'Relationship'} *
                    </label>
                    <select
                      value={r.type}
                      onChange={(e) => updateRecipient(index, 'type', e.target.value)}
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
                  {r.type === 'ca' && (
                    <div className="share-field">
                      <label className="share-label-sm">{isDE ? 'Land' : 'Country'}</label>
                      <select
                        value={r.caCountry}
                        onChange={(e) => updateRecipient(index, 'caCountry', e.target.value)}
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
                  {r.type === 'family' && (
                    <div className="share-field">
                      <label className="share-label-sm">{isDE ? 'Verhältnis' : 'Relation'}</label>
                      <select
                        value={r.familyRelation}
                        onChange={(e) => updateRecipient(index, 'familyRelation', e.target.value)}
                        className="share-select"
                      >
                        <option value="">{isDE ? 'Auswählen...' : 'Select...'}</option>
                        {FAMILY_RELATIONS.map((rel) => (
                          <option key={rel.value} value={rel.value}>
                            {isDE ? rel.labelDe : rel.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
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
                  {isDE ? 'Wird gesendet...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isDE ? 'Dokumente per E-Mail senden' : 'Mail Documents to Recipient(s)'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
