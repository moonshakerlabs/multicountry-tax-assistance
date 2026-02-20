import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Globe, Share2, ChevronDown, ChevronUp, Gift, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { APP_NAME, APP_TAGLINE } from '@/lib/appConfig';
import { useSubscriptionConfig } from '@/hooks/useSubscriptionConfig';
import './Home.css';

const faqs = [
  {
    q: 'What membership plans are available?',
    a: `${APP_NAME} offers Free, Standard, and Professional plans tailored to individual taxpayers and professionals managing cross-border income. Each plan includes different document storage limits, AI tools access, and community features. Visit the Pricing page for full details.`,
  },
  {
    q: `Can I try ${APP_NAME} before subscribing?`,
    a: `Yes! New users get a free trial with access to Pro features. Early access users enjoy even longer trial periods with premium features. Sign up today to take advantage of our launch offers!`,
  },
  {
    q: 'What happens to my data if I cancel my subscription?',
    a: 'Your data remains securely stored for 30 days after cancellation. During this period you can export your documents. After 30 days, data is permanently deleted in line with our GDPR-aligned data policy.',
  },
  {
    q: `Is ${APP_NAME} compliant with GDPR and other privacy regulations?`,
    a: `Absolutely. ${APP_NAME} is built with a privacy-first architecture. All data is stored with explicit user consent, and you retain full control over your documents and personal data at all times.`,
  },
  {
    q: `Which countries does ${APP_NAME} currently support?`,
    a: `${APP_NAME} currently supports tax document organisation for Germany, India, and the UAE, with more countries being added regularly. Our platform is designed from the ground up for globally mobile taxpayers.`,
  },
];

const features = [
  {
    icon: Shield,
    title: 'Privacy-first & GDPR aligned',
    description: 'Built with a strong focus on privacy, aligned with global privacy policies and data protection laws to keep your financial information safe.'
  },
  {
    icon: Globe,
    title: 'Built for cross-border tax complexity',
    description: 'Designed specifically for people managing income across multiple countries.'
  },
  {
    icon: Share2,
    title: 'Share securely with your tax advisor',
    description: 'Generate secure, time-limited access for your trusted professionals.'
  }
];

export default function Home() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { config, loading: configLoading, isEarlyAccessActive, getDaysRemaining } = useSubscriptionConfig();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const earlyAccessActive = isEarlyAccessActive();
  const daysRemaining = getDaysRemaining();

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="home-header-content">
          <div className="home-logo">
            <div className="home-logo-icon" />
            <span className="home-logo-text">{APP_NAME}</span>
          </div>
          <nav className="home-nav">
            <div className="home-auth-buttons">
              <Button asChild variant="ghost" size="sm">
                <Link to="/taxoverflow">TaxOverFlow</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/pricing">Pricing</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/blog">Blog</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/auth?mode=signin">Sign In</Link>
              </Button>
              <Button asChild variant="default">
                <Link to="/auth?mode=signup">Sign Up</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Early Access Banner */}
      {earlyAccessActive && !configLoading && (
        <section className="home-early-access-banner">
          <div className="home-early-access-content">
            <div className="home-early-access-icon-wrapper">
              <Gift className="home-early-access-icon" />
            </div>
            <div className="home-early-access-text">
              <h3 className="home-early-access-headline">{config.early_access_headline}</h3>
              <p className="home-early-access-description">{config.early_access_description}</p>
              <div className="home-early-access-details">
                <span className="home-early-access-badge">
                  <Clock className="h-3.5 w-3.5" />
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                </span>
                <span className="home-early-access-badge home-early-access-badge-pro">
                  {config.early_access_pro_days} days Pro features free
                </span>
                <span className="home-early-access-badge home-early-access-badge-freemium">
                  {config.early_access_freemium_days} days Freemium features free
                </span>
              </div>
            </div>
            <Button asChild variant="default" size="lg" className="home-early-access-cta">
              <Link to="/auth?mode=signup">Claim Your Free Trial</Link>
            </Button>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-content">
          <div className="home-hero-tagline">A platform for cross-border financial clarity</div>
          <h1 className="home-hero-title">
            Organise tax records.
            <br />
            <span className="home-hero-subtitle">Align income across jurisdictions.</span>
          </h1>
          <p className="home-hero-description">
            Built for globally mobile tax payers managing income across multiple countries.
          </p>
          <div className="home-hero-actions">
            <Button asChild variant="hero" size="xl">
              <Link to="/pricing">Get Started – Early Access</Link>
            </Button>
            <Button asChild variant="hero-outline" size="xl">
              <Link to="/taxoverflow">See what others are talking about</Link>
            </Button>
          </div>

          {/* Trial info below buttons */}
          {!configLoading && (
            <div className="home-trial-info">
              {earlyAccessActive ? (
                <p className="home-trial-text">
                  🎉 <strong>Launch Offer:</strong> Sign up now for {config.early_access_pro_days} days of Pro features + {config.early_access_freemium_days} days of Freemium — <strong>completely free!</strong>
                </p>
              ) : (
                <p className="home-trial-text">
                  ✨ New users get a <strong>{config.default_trial_days}-day free trial</strong> with {config.default_trial_plan} features.
                </p>
              )}
            </div>
          )}

          {/* Feature cards directly below buttons */}
          <div className="home-features-inline">
            {features.map((feature) => (
              <div key={feature.title} className="home-feature-card-inline">
                <div className="home-feature-icon-wrapper">
                  <feature.icon className="home-feature-icon" />
                </div>
                <h3 className="home-feature-title">{feature.title}</h3>
                <p className="home-feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="home-faq">
        <div className="home-faq-content">
          <h2 className="home-faq-title">Frequently Asked Questions</h2>
          <p className="home-faq-subtitle">Everything you need to know about {APP_NAME} membership and plans.</p>
          <div className="home-faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className="home-faq-item">
                <button
                  className="home-faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="home-faq-chevron" />
                    : <ChevronDown className="home-faq-chevron" />
                  }
                </button>
                {openFaq === i && (
                  <div className="home-faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer-content">
          <div className="home-footer-logo">
            <div className="home-footer-logo-icon" />
            <span className="home-footer-logo-text">{APP_NAME}</span>
          </div>
          <nav className="home-footer-nav">
            <Link to="/privacy" className="home-footer-link">Privacy Policy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
