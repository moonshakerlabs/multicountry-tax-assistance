import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { Check, Star, ArrowLeft } from 'lucide-react';
import './Pricing.css';

const plans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Get started with basic features',
    features: [
      'Basic document upload',
      'Single country support',
      'Community: 1 post/week',
      'Email support',
    ],
    cta: 'Current Plan',
    popular: false,
    planKey: 'FREE',
  },
  {
    name: 'Freemium',
    monthlyPrice: 5,
    yearlyPrice: 50,
    description: 'Unlock the Secure Vault and more',
    features: [
      'Everything in Free',
      'Secure Document Vault',
      'Multi-country support (2 countries)',
      'Community: 15 posts/month',
      'Document sharing',
      'Priority email support',
      'Mobile Document Scanner (Coming Soon)',
    ],
    cta: 'Subscribe',
    popular: false,
    planKey: 'FREEMIUM',
  },
  {
    name: 'Pro',
    monthlyPrice: 10,
    yearlyPrice: 100,
    description: 'Full access to all premium features',
    features: [
      'Everything in Freemium',
      'Unlimited document storage',
      'Up to 5 countries in Community',
      'Unlimited community posts',
      'Advanced sharing controls',
      'Google Drive integration',
      'Dedicated support',
      'Mobile Document Scanner (Coming Soon)',
    ],
    cta: 'Subscribe',
    popular: true,
    planKey: 'PRO',
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
              <Link to="/">
                <ArrowLeft className="pricing-back-icon" />
                Back to Home
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
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
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
                    <h3 className="pricing-plan-name">{plan.name}</h3>
                    <p className="pricing-plan-description">{plan.description}</p>
                  </div>
                  <div className="pricing-price-wrapper">
                    <span className="pricing-price-amount">
                      ${price}
                    </span>
                    {price > 0 && (
                      <span className="pricing-price-period">{period}</span>
                    )}
                  </div>
                  <ul className="pricing-features-list">
                    {plan.features.map((feature) => (
                      <li key={feature} className="pricing-feature-item">
                        <Check className="pricing-feature-check" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pricing-card-footer">
                    {plan.planKey === 'FREE' ? (
                      <Button variant="outline" className="pricing-cta-btn" disabled>
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
