import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { privacyPolicyPageData, PolicySection } from '@/lib/privacyPolicyData';
import { APP_NAME } from '@/lib/appConfig';
import './TermsAndConditions.css';

function renderSection(section: PolicySection, index: number) {
  switch (section.type) {
    case 'heading':
      return <h2 key={index} className="tc-heading">{section.content as string}</h2>;
    case 'subheading':
      return <h3 key={index} className="tc-subheading">{section.content as string}</h3>;
    case 'paragraph':
      return <p key={index} className="tc-paragraph">{section.content as string}</p>;
    case 'bullets':
      return (
        <ul key={index} className="tc-bullets">
          {(section.content as string[]).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

export default function PrivacyPolicy() {
  return (
    <div className="tc-container">
      <div className="tc-content">
        <div className="tc-back-row">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
            </Link>
          </Button>
        </div>

        <div className="tc-logo">
          <Link to="/" className="tc-logo-link">
            <div className="tc-logo-icon" />
            <span className="tc-logo-text">{APP_NAME}</span>
          </Link>
        </div>

        <div className="tc-card">
          <h1 className="tc-title">{privacyPolicyPageData.title}</h1>
          <p className="tc-last-updated">
            Last updated: {privacyPolicyPageData.lastUpdated}
          </p>

          <div className="tc-policy-scroll">
            {privacyPolicyPageData.sections.map((section, index) =>
              renderSection(section, index)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
