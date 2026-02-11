import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import './CommunityHeader.css';

interface CommunityHeaderProps {
  onAskQuestion: () => void;
  canPost: boolean;
}

export default function CommunityHeader({ onAskQuestion, canPost }: CommunityHeaderProps) {
  return (
    <header className="community-header">
      <div className="community-header-content">
        <div className="community-header-left">
          <Link to="/" className="community-logo-link">
            <div className="community-logo-icon" />
            <span className="community-logo-text">WorTaF</span>
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
          <Button onClick={onAskQuestion} disabled={!canPost} size="sm">
            <Plus className="community-plus-icon" />
            Ask Question
          </Button>
        </div>
      </div>
    </header>
  );
}
