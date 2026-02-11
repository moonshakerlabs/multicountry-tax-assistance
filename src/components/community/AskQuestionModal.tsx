import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import './AskQuestionModal.css';

interface AskQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; country: string; tags: string[] }) => void;
  allowedCountries: string[];
  submitting?: boolean;
}

export default function AskQuestionModal({ isOpen, onClose, onSubmit, allowedCountries, submitting }: AskQuestionModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState(allowedCountries[0] || '');
  const [tagsInput, setTagsInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !country) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    onSubmit({ title: title.trim(), description: description.trim(), country, tags });
    setTitle('');
    setDescription('');
    setTagsInput('');
  };

  return (
    <div className="ask-modal-overlay" onClick={onClose}>
      <div className="ask-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ask-modal-header">
          <h2 className="ask-modal-title">Ask a Tax Question</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="ask-modal-close-icon" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="ask-modal-form">
          <div className="ask-modal-field">
            <label className="ask-modal-label">Country *</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="ask-modal-select"
              required
            >
              <option value="">Select country</option>
              {allowedCountries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="ask-modal-field">
            <label className="ask-modal-label">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your tax question?"
              required
              maxLength={200}
            />
          </div>
          <div className="ask-modal-field">
            <label className="ask-modal-label">Description *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about your tax situation..."
              rows={6}
              required
            />
          </div>
          <div className="ask-modal-field">
            <label className="ask-modal-label">Tags (comma-separated, optional)</label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. income-tax, deduction, double-taxation"
            />
          </div>
          <div className="ask-modal-actions">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting || !title.trim() || !description.trim() || !country}>
              {submitting ? 'Posting...' : 'Post Question'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
