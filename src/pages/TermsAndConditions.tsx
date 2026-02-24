import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { privacyPolicyData, PolicySection } from '@/lib/privacyPolicyData';
import { useToast } from '@/hooks/use-toast';
import './TermsAndConditions.css';
import { APP_NAME, APP_TAGLINE } from '@/lib/appConfig';

function renderSection(section: PolicySection, index: number) {
  switch (section.type) {
    case 'heading':
      return (
        <h2 key={index} className="tc-heading">
          {section.content as string}
        </h2>
      );
    case 'subheading':
      return (
        <h3 key={index} className="tc-subheading">
          {section.content as string}
        </h3>
      );
    case 'paragraph':
      return (
        <p key={index} className="tc-paragraph">
          {section.content as string}
        </p>
      );
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

export default function TermsAndConditions() {
  const [accepted, setAccepted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get signup data passed via navigation state
  const signupData = location.state as {
    type: 'email' | 'google';
    email?: string;
    password?: string;
  } | null;

  if (!signupData) {
    // If someone navigates here directly without signup data, redirect to auth
    return (
      <div className="tc-container">
        <div className="tc-content">
          <p className="tc-paragraph" style={{ textAlign: 'center', marginTop: '2rem' }}>
            Please start the sign-up process first.
          </p>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/auth?mode=signup" className="tc-back-link">
              ← Go to Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleProceed = () => {
    if (!accepted) {
      toast({
        title: 'Acceptance required',
        description: 'You must accept the Terms & Conditions to proceed.',
        variant: 'destructive',
      });
      return;
    }
    setShowModal(true);
  };

  const handleConfirmAndSignUp = () => {
    setShowModal(false);
    // Navigate back to auth with accepted state to complete signup
    navigate('/auth', {
      state: {
        termsAccepted: true,
        signupData,
      },
      replace: true,
    });
  };

  return (
    <div className="tc-container">
      <div className="tc-content">
        {/* Back link */}
        <div className="tc-back-row">
          <Link to="/auth?mode=signup" className="tc-back-link">
            ← Back to Sign Up
          </Link>
        </div>

        {/* Logo */}
        <div className="tc-logo">
          <Link to="/" className="tc-logo-link">
            <img src="/images/taxbebo-logo.png" alt={APP_NAME} className="tc-logo-icon" />
            <span className="tc-logo-text">{APP_NAME} – {APP_TAGLINE}</span>
          </Link>
        </div>

        {/* Policy Card */}
        <div className="tc-card">
          <h1 className="tc-title">{privacyPolicyData.title}</h1>
          <p className="tc-last-updated">
            Last updated: {privacyPolicyData.lastUpdated}
          </p>

          {/* Scrollable policy content */}
          <div className="tc-policy-scroll">
            {privacyPolicyData.sections.map((section, index) =>
              renderSection(section, index)
            )}
          </div>

          {/* Acceptance checkbox */}
          <div className="tc-accept-row">
            <Checkbox
              id="accept-terms"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <label htmlFor="accept-terms" className="tc-accept-label">
              I have read the policy and I accept all Terms & Conditions.
            </label>
          </div>

          {/* Action buttons */}
          <div className="tc-actions">
            <Button
              variant="outline"
              onClick={() => navigate('/auth?mode=signup')}
            >
              Cancel
            </Button>
            <Button onClick={handleProceed} disabled={!accepted}>
              {signupData.type === 'google'
                ? 'Continue with Google'
                : 'Create Account'}
            </Button>
          </div>
        </div>
      </div>

      {/* Data Revocation Info Modal */}
      {showModal && (
        <div className="tc-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-icon">📋</div>
            <h2 className="tc-modal-title">Data Consent & Revocation</h2>
            <div className="tc-modal-body">
              <p>
                By proceeding, you consent to the storage of your documents as
                described in our Terms & Conditions.
              </p>
              <p>
                <strong>You can revoke this consent at any time</strong> from
                your Profile settings. When revoking, you may specify a
                retention end date.
              </p>
              <p>
                On the specified date, all your data and files stored in the
                Secure Storage Vault will be permanently removed from our
                systems.
              </p>
              <p>
                Documents stored in your Personal Google Drive are managed by
                you and are not affected by revocation.
              </p>
            </div>
            <div className="tc-modal-actions">
              <Button onClick={handleConfirmAndSignUp} className="tc-modal-ok-btn">
                OK, I understand
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
