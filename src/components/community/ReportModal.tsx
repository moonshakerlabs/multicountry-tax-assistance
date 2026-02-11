import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import './ReportModal.css';

interface ReportModalProps {
  isOpen: boolean;
  entityType: 'POST' | 'ANSWER';
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting?: boolean;
}

export default function ReportModal({ isOpen, entityType, onClose, onSubmit, submitting }: ReportModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmit(reason.trim());
    setReason('');
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h2 className="report-modal-title">Report {entityType === 'POST' ? 'Question' : 'Answer'}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="report-modal-close" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="report-modal-form">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe why this content should be reviewed..."
            rows={4}
            required
          />
          <div className="report-modal-actions">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={submitting || !reason.trim()}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
