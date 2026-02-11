import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { Check, X as XIcon, Star, ArrowLeft, Sparkles } from 'lucide-react';
import './Pricing.css';

interface PlanFeature {
  text: string;
  included: boolean;
  comingSoon?: boolean;
}

interface PlanSection {
  title: string;
  emoji: string;
  features: PlanFeature[];
}

interface Plan {
  name: string;
  color: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  description: string;
  sections: PlanSection[];
  cta: string;
  popular: boolean;
  planKey: string;
  pricingTBD?: boolean;
}

const plans: Plan[] = [
  {
    name: 'Free',
    color: '🟢',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Get started with basic features',
    planKey: 'FREE',
    popular: false,
    cta: 'Current Plan',
    sections: [
      {
        title: 'Upload & Document Storage',
        emoji: '📂',
        features: [
          { text: 'Upload via Web App only', included: true },
          { text: 'Store documents in Personal Google Drive only', included: true },
          { text: 'No Secure Storage Vault access', included: false },
          { text: 'No Mobile Scanner to Vault', included: false },
        ],
      },
      {
        title: 'Connect with Taxpayers Community',
        emoji: '🌍',
        features: [
          { text: 'Select 1 country', included: true },
          { text: 'View all posts within selected country', included: true },
          { text: 'Post 1 question per month', included: true },
          { text: 'Answer unlimited questions', included: true },
          { text: 'Upvote & Downvote posts and answers', included: true },
          { text: 'Report inappropriate content', included: true },
          { text: 'Mark one answer as ⭐', included: true },
          { text: 'Earn points for correct answers', included: true },
        ],
      },
      {
        title: 'Sharing with CA',
        emoji: '🤝',
        features: [
          { text: 'One-click sharing from Personal Google Drive', included: true },
          { text: 'Access restricted to authenticated users', included: true },
        ],
      },
      {
        title: 'AI Assistant Features',
        emoji: '🤖',
        features: [
          { text: 'No AI Assistant access', included: false },
        ],
      },
    ],
  },
  {
    name: 'Freemium',
    color: '🔵',
    monthlyPrice: 5,
    yearlyPrice: 50,
    description: 'Unlock the Secure Vault and more',
    planKey: 'FREEMIUM',
    popular: false,
    cta: 'Subscribe',
    sections: [
      {
        title: 'Upload & Document Storage',
        emoji: '📂',
        features: [
          { text: 'Upload via Web App', included: true },
          { text: 'Choose: Google Drive or Secure Storage Vault', included: true },
          { text: 'Access to Secure Encrypted Storage Vault', included: true },
          { text: 'Special Mobile Scanner upload for Vault', included: true, comingSoon: true },
          { text: 'Web upload for both Google Drive and Vault', included: true },
        ],
      },
      {
        title: 'Connect with Taxpayers Community',
        emoji: '🌍',
        features: [
          { text: 'Select up to 2 countries', included: true },
          { text: 'View posts from selected 2 countries', included: true },
          { text: '5 questions per country/month (10 total)', included: true },
          { text: 'Answer unlimited questions', included: true },
          { text: 'Upvote & Downvote posts and answers', included: true },
          { text: 'Report inappropriate content', included: true },
          { text: 'Mark one answer as ⭐', included: true },
          { text: 'Earn & redeem points for discounts', included: true },
        ],
      },
      {
        title: 'Sharing with CA',
        emoji: '🤝',
        features: [
          { text: 'One-click sharing from Google Drive', included: true },
          { text: 'Secure sharing from Storage Vault', included: true },
          { text: 'Access restricted to authenticated users', included: true },
        ],
      },
      {
        title: 'AI Assistant Features',
        emoji: '🤖',
        features: [
          { text: 'No AI Assistant access', included: false },
        ],
      },
    ],
  },
  {
    name: 'Pro',
    color: '🟣',
    monthlyPrice: 10,
    yearlyPrice: 100,
    description: 'Full access with AI-powered features',
    planKey: 'PRO',
    popular: true,
    cta: 'Subscribe',
    sections: [
      {
        title: 'Upload & Document Storage',
        emoji: '📂',
        features: [
          { text: 'Upload via Web App', included: true },
          { text: 'Choose: Google Drive or Secure Storage Vault', included: true },
          { text: 'Access to Secure Encrypted Storage Vault', included: true },
          { text: 'Special Mobile Scanner upload for Vault', included: true, comingSoon: true },
          { text: 'Higher storage limits', included: true },
        ],
      },
      {
        title: 'Connect with Taxpayers Community',
        emoji: '🌍',
        features: [
          { text: 'Select up to 5 countries', included: true },
          { text: 'View posts from selected 5 countries', included: true },
          { text: '10 questions per country/month (50 total)', included: true },
          { text: 'Answer unlimited questions', included: true },
          { text: 'Upvote & Downvote posts and answers', included: true },
          { text: 'Report inappropriate content', included: true },
          { text: 'Mark one answer as ⭐', included: true },
          { text: 'Earn & redeem points for discounts', included: true },
        ],
      },
      {
        title: 'Sharing with CA',
        emoji: '🤝',
        features: [
          { text: 'One-click sharing from Google Drive', included: true },
          { text: 'Secure sharing from Storage Vault', included: true },
          { text: 'Access restricted to authenticated users', included: true },
        ],
      },
      {
        title: 'AI Assistant Features',
        emoji: '🤖',
        features: [
          { text: 'Limited AI Assistant access', included: true },
          { text: 'AI-based document analysis', included: true },
          { text: 'AI-generated tax summaries', included: true },
          { text: 'AI-assisted multi-country income combination', included: true },
          { text: 'AI alignment of multiple tax calendars', included: true },
        ],
      },
    ],
  },
  {
    name: 'Super Pro',
    color: '🟡',
    monthlyPrice: null,
    yearlyPrice: null,
    description: 'Maximum power for complex tax needs',
    planKey: 'SUPER_PRO',
    popular: false,
    cta: 'Coming Soon',
    pricingTBD: true,
    sections: [
      {
        title: 'Upload & Document Storage',
        emoji: '📂',
        features: [
          { text: 'All Pro features', included: true },
          { text: 'Maximum storage allocation', included: true },
          { text: 'Special Mobile Scanner upload for Vault', included: true, comingSoon: true },
        ],
      },
      {
        title: 'Connect with Taxpayers Community',
        emoji: '🌍',
        features: [
          { text: 'All Pro community features', included: true },
        ],
      },
      {
        title: 'Sharing with CA',
        emoji: '🤝',
        features: [
          { text: 'All Pro sharing features', included: true },
        ],
      },
      {
        title: 'AI Assistant Features',
        emoji: '🤖',
        features: [
          { text: 'Full AI Assistant access', included: true },
          { text: 'Advanced multi-country income computation', included: true },
          { text: 'Cross-jurisdiction compliance alignment', included: true },
          { text: 'Automated tax calendar harmonization', included: true },
          { text: 'Priority AI processing', included: true },
        ],
      },
    ],
  },
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const { user } = useAuth();

  return (
    <div className="pricing-container">
      {/* Header */}
      <header className="pricing-header">
        <div className="pricing-header-content">
          <div className="pricing-logo">
            <Link to="/" className="pricing-logo-link">
              <div className="pricing-logo-icon" />
              <span className="pricing-logo-text">WorTaF</span>
            </Link>
          </div>
          <nav className="pricing-nav">
            <Button asChild variant="ghost" size="sm">
              <Link to={user ? '/dashboard' : '/'}>
                <ArrowLeft className="pricing-back-icon" />
                {user ? 'Dashboard' : 'Back to Home'}
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Pricing Content */}
      <main className="pricing-main">
        <div className="pricing-content">
          <h1 className="pricing-title">Simple, transparent pricing</h1>
          <p className="pricing-subtitle">
            Choose the plan that fits your cross-border tax needs.
          </p>

          {/* Billing Toggle */}
          <div className="pricing-toggle-wrapper">
            <span className={`pricing-toggle-label ${!isYearly ? 'pricing-toggle-active' : ''}`}>
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="pricing-toggle-switch"
            />
            <span className={`pricing-toggle-label ${isYearly ? 'pricing-toggle-active' : ''}`}>
              Yearly
            </span>
            {isYearly && (
              <span className="pricing-savings-badge">Save 2 Months</span>
            )}
          </div>

          {/* Plans Grid */}
          <div className="pricing-grid">
            {plans.map((plan) => {
              const price = plan.pricingTBD
                ? null
                : isYearly
                  ? plan.yearlyPrice
                  : plan.monthlyPrice;
              const period = isYearly ? '/year' : '/month';

              return (
                <div
                  key={plan.name}
                  className={`pricing-card ${plan.popular ? 'pricing-card-popular' : ''}`}
                >
                  {plan.popular && (
                    <div className="pricing-popular-badge">
                      <Star className="pricing-popular-icon" />
                      Most Popular
                    </div>
                  )}
                  <div className="pricing-card-header">
                    <h3 className="pricing-plan-name">
                      {plan.color} {plan.name}
                    </h3>
                    <p className="pricing-plan-description">{plan.description}</p>
                  </div>
                  <div className="pricing-price-wrapper">
                    {plan.pricingTBD ? (
                      <span className="pricing-price-tbd">Pricing TBD</span>
                    ) : (
                      <>
                        <span className="pricing-price-amount">${price}</span>
                        {price !== null && price > 0 && (
                          <span className="pricing-price-period">{period}</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Feature Sections */}
                  <div className="pricing-sections">
                    {plan.sections.map((section) => (
                      <div key={section.title} className="pricing-section">
                        <h4 className="pricing-section-title">
                          {section.emoji} {section.title}
                        </h4>
                        <ul className="pricing-features-list">
                          {section.features.map((feature, idx) => (
                            <li key={idx} className={`pricing-feature-item ${!feature.included ? 'pricing-feature-disabled' : ''}`}>
                              {feature.included ? (
                                <Check className="pricing-feature-check" />
                              ) : (
                                <XIcon className="pricing-feature-x" />
                              )}
                              <span>
                                {feature.text}
                                {feature.comingSoon && (
                                  <span className="pricing-coming-soon">Coming Soon</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="pricing-card-footer">
                    {plan.planKey === 'FREE' ? (
                      <Button variant="outline" className="pricing-cta-btn" disabled>
                        {plan.cta}
                      </Button>
                    ) : plan.pricingTBD ? (
                      <Button variant="outline" className="pricing-cta-btn" disabled>
                        <Sparkles className="h-4 w-4" />
                        {plan.cta}
                      </Button>
                    ) : (
                      <Button
                        asChild
                        variant={plan.popular ? 'default' : 'outline'}
                        className="pricing-cta-btn"
                      >
                        <Link to={user ? '/dashboard' : '/auth?mode=signup'}>
                          {plan.cta}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legacy Pricing Notice */}
          <div className="pricing-legacy-notice">
            <div className="pricing-legacy-content">
              <h3 className="pricing-legacy-title">🔔 Limited Period Offer</h3>
              <p className="pricing-legacy-text">
                Early subscribers lock in current pricing for up to 5 years, provided subscription remains active without interruption.
              </p>
              <p className="pricing-legacy-warning">
                ⚠ If you cancel after a price increase, resubscription will follow the new pricing structure.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pricing-footer">
        <div className="pricing-footer-content">
          <div className="pricing-footer-logo">
            <div className="pricing-footer-logo-icon" />
            <span className="pricing-footer-logo-text">WorTaF</span>
          </div>
          <nav className="pricing-footer-nav">
            <a href="#" className="pricing-footer-link">Privacy Policy</a>
            <a href="#" className="pricing-footer-link">Terms</a>
            <a href="#" className="pricing-footer-link">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
