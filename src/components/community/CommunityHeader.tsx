import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, BookOpen, X, CheckCircle2, Brain, HeadphonesIcon } from 'lucide-react';
import { APP_NAME } from '@/lib/appConfig';
import './CommunityHeader.css';

const COMMUNITY_GUIDELINES = [
  {
    title: 'Tax-related queries only',
    body: 'TaxOverFlow is strictly for tax, financial compliance, and cross-border income questions. Posts about unrelated personal, dating, or social topics will be removed immediately.',
  },
  {
    title: 'No hate speech or discrimination',
    body: 'Content targeting any religion, community, race, ethnicity, gender, or sexual orientation is strictly prohibited and will result in immediate account suspension.',
  },
  {
    title: 'No defamation or personal attacks',
    body: 'Do not post defamatory, false, or misleading content about any individual, company, government body, or institution. Respectful disagreement is welcome; personal attacks are not.',
  },
  {
    title: 'No vulgar or offensive language',
    body: 'Keep all posts professional and constructive. Vulgar, obscene, or offensive language is not tolerated in any form — including in titles, descriptions, tags, and comments.',
  },
  {
    title: 'Respect all users',
    body: 'Treat every community member with respect. Harassment, intimidation, or threatening behavior — whether direct or subtle — will lead to reporting and potential account ban.',
  },
  {
    title: 'Report misuse responsibly',
    body: 'If you encounter content that violates these guidelines, use the Report button. False or malicious reporting of other users is itself a violation and may result in suspension.',
  },
  {
    title: 'No spam or self-promotion',
    body: 'Do not post duplicate questions, commercial advertisements, or unsolicited self-promotional links. Each post should contribute genuine value to the community.',
  },
  {
    title: 'Consequences of violations',
    body: 'Violations are reviewed by the moderation team. Depending on severity, actions may include post removal, temporary restriction, or permanent account ban. Repeat offenders will be blocked without notice.',
  },
];

interface CommunityHeaderProps {
  onAskQuestion: () => void;
  canPost: boolean;
  guidelinesAccepted: boolean;
  onGuidelinesAccepted: (accepted: boolean) => void;
  showAITools?: boolean;
}

export default function CommunityHeader({ onAskQuestion, canPost, guidelinesAccepted, onGuidelinesAccepted, showAITools }: CommunityHeaderProps) {
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [acceptChecked, setAcceptChecked] = useState(guidelinesAccepted);

  const handleGuidelinesAccept = () => {
    onGuidelinesAccepted(true);
    setShowGuidelines(false);
  };

  const handleCheckboxChange = (checked: boolean) => {
    setAcceptChecked(checked);
    if (!checked) {
      onGuidelinesAccepted(false);
    }
  };

  const handleOpenGuidelines = () => {
    setAcceptChecked(guidelinesAccepted);
    setShowGuidelines(true);
  };

  const handleAskQuestion = () => {
    if (!guidelinesAccepted) {
      setAcceptChecked(false);
      setShowGuidelines(true);
    } else {
      onAskQuestion();
    }
  };

  return (
    <>
      <header className="community-header">
        <div className="community-header-content">
          <div className="community-header-left">
            <Link to="/" className="community-logo-link">
              <img src="/images/taxbebo-logo.png" alt={APP_NAME} className="community-logo-icon" />
              <span className="community-logo-text">{APP_NAME}</span>
            </Link>
            <span className="community-header-divider">/</span>
            <h1 className="community-header-title">TaxOverFlow</h1>
          </div>
          <div className="community-header-right">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/profile">Profile</Link>
            </Button>
            {showAITools && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/ai-tools"><Brain className="community-plus-icon" />AI Tools</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/support"><HeadphonesIcon className="community-plus-icon" />Support</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenGuidelines}>
              <BookOpen className="community-plus-icon" />
              Community Guidelines
              {guidelinesAccepted && <CheckCircle2 className="h-3.5 w-3.5 ml-1 text-green-500" />}
            </Button>
            <Button
              onClick={handleAskQuestion}
              disabled={!canPost || !guidelinesAccepted}
              size="sm"
              title={!guidelinesAccepted ? 'Please read and accept Community Guidelines first' : undefined}
            >
              <Plus className="community-plus-icon" />
              Ask Question
              {!guidelinesAccepted && <span className="ml-1 text-xs opacity-70">(Guidelines required)</span>}
            </Button>
          </div>
        </div>
      </header>

      {/* Community Guidelines Modal */}
      {showGuidelines && (
        <div className="community-guidelines-overlay" onClick={() => setShowGuidelines(false)}>
          <div className="community-guidelines-modal" onClick={e => e.stopPropagation()}>
            <div className="community-guidelines-header">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="community-guidelines-title">Community Guidelines</h2>
              </div>
              <button className="community-guidelines-close" onClick={() => setShowGuidelines(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="community-guidelines-intro">
              TaxOverFlow is a community built on trust, respect, and shared knowledge.
              By participating, you agree to follow these guidelines. Please read them carefully — you must accept before posting a question or answering.
            </p>
            <div className="community-guidelines-list">
              {COMMUNITY_GUIDELINES.map((g, i) => (
                <div key={i} className="community-guideline-item">
                  <div className="community-guideline-number">{i + 1}</div>
                  <div>
                    <h3 className="community-guideline-name">{g.title}</h3>
                    <p className="community-guideline-body">{g.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="community-guidelines-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
              <label className="community-guidelines-accept-row">
                <input
                  type="checkbox"
                  checked={acceptChecked}
                  onChange={e => handleCheckboxChange(e.target.checked)}
                  className="community-guidelines-checkbox"
                />
                <span className="community-guidelines-accept-label">
                  I have read and agree to follow the Community Guidelines
                </span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setShowGuidelines(false)}>Close</Button>
                <Button onClick={handleGuidelinesAccept} disabled={!acceptChecked}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Accept & Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
