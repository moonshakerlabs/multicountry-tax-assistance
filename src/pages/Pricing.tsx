import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useSubscriptionConfig } from '@/hooks/useSubscriptionConfig';
import { supabase } from '@/integrations/supabase/client';
import { Check, X as XIcon, Star, ArrowLeft, Gift, Clock, ArrowUp, ArrowDown, Hourglass, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import './Pricing.css';
import { APP_NAME } from '@/lib/appConfig';

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

const PLAN_ORDER = ['FREE', 'FREEMIUM', 'PRO', 'SUPER_PRO'];

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
  const { subscription, loading: subLoading } = useSubscription();
  const { config, isEarlyAccessActive, getDaysRemaining } = useSubscriptionConfig();
  const { toast } = useToast();
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  const currentPlanIndex = PLAN_ORDER.indexOf(subscription.subscription_plan);
  const earlyAccessActive = isEarlyAccessActive();

  // Calculate days until billing cycle end
  const getDaysUntilBillingEnd = (): number => {
    if (!subscription.subscription_plan || subscription.subscription_plan === 'FREE') return 999;
    const sub = subscription as any;
    const startDate = sub.subscription_start_date ? new Date(sub.subscription_start_date) : new Date();
    const now = new Date();
    const billingCycle = sub.billing_cycle || 'MONTHLY';
    
    // Calculate the next billing date
    let nextBilling = new Date(startDate);
    if (billingCycle === 'YEARLY') {
      while (nextBilling <= now) nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    } else {
      while (nextBilling <= now) nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    
    const diffMs = nextBilling.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const canDowngrade = (): boolean => {
    const daysLeft = getDaysUntilBillingEnd();
    return daysLeft > config.downgrade_cutoff_days;
  };

  const handlePlanChange = async (targetPlan: string) => {
    if (!user) return;
    const targetIndex = PLAN_ORDER.indexOf(targetPlan);
    const isUpgrade = targetIndex > currentPlanIndex;
    const changeType = isUpgrade ? 'UPGRADE' : 'DOWNGRADE';

    // Block downgrade if too close to billing cycle
    if (!isUpgrade && !canDowngrade()) {
      toast({
        title: 'Downgrade not available',
        description: `Downgrades must be requested at least ${config.downgrade_cutoff_days} days before your billing cycle ends. You have ${getDaysUntilBillingEnd()} day(s) remaining.`,
        variant: 'destructive',
      });
      return;
    }

    setChangingPlan(targetPlan);
    try {
      const updateData: any = {
        subscription_plan: targetPlan,
        billing_cycle: isYearly ? 'YEARLY' : 'MONTHLY',
        updated_at: new Date().toISOString(),
      };

      // For downgrades, the current plan runs until billing cycle end
      // Set a vault grace period if downgrading from vault-eligible plan
      if (!isUpgrade) {
        const sub = subscription as any;
        const startDate = sub.subscription_start_date ? new Date(sub.subscription_start_date) : new Date();
        const billingCycle = sub.billing_cycle || 'MONTHLY';
        let nextBilling = new Date(startDate);
        if (billingCycle === 'YEARLY') {
          while (nextBilling <= new Date()) nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        } else {
          while (nextBilling <= new Date()) nextBilling.setMonth(nextBilling.getMonth() + 1);
        }
        updateData.subscription_end_date = nextBilling.toISOString();
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      const plan = plans.find(p => p.planKey === targetPlan);
      const price = isYearly ? (plan?.yearlyPrice || 0) : (plan?.monthlyPrice || 0);

      await supabase.from('subscription_history').insert({
        user_id: user.id,
        plan: targetPlan,
        billing_cycle: isYearly ? 'YEARLY' : 'MONTHLY',
        change_type: changeType,
        price_at_purchase: price,
        is_legacy_applied: false,
      });

      // Send subscription change notification email
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-user-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscription_change',
          userId: user.id,
          data: {
            oldPlan: subscription.subscription_plan,
            newPlan: targetPlan,
            changeType,
          },
        }),
      }).catch(err => console.error('Subscription email error:', err));

      if (isUpgrade) {
        toast({
          title: '🎉 Upgraded!',
          description: `Your plan has been upgraded to ${plan?.name || targetPlan}.`,
        });
      } else {
        const daysLeft = getDaysUntilBillingEnd();
        toast({
          title: 'Plan downgraded',
          description: `Your current features will remain active for ${daysLeft} more day(s) until your billing cycle ends. ${
            subscription.subscription_plan !== 'FREE' ? `You have ${config.vault_grace_period_days} days to download any files from the Secure Vault.` : ''
          }`,
          duration: 8000,
        });
      }

      window.location.href = '/pricing';
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to change plan.', variant: 'destructive' });
    } finally {
      setChangingPlan(null);
    }
  };

  const getButtonForPlan = (plan: Plan) => {
    if (!user) {
      if (plan.pricingTBD) {
        return (
          <Button variant="outline" className="pricing-cta-btn" disabled>
            <Hourglass className="h-4 w-4" /> Coming Soon
          </Button>
        );
      }
      return (
        <Button asChild variant={plan.popular ? 'default' : 'outline'} className="pricing-cta-btn">
          <Link to="/auth?mode=signup">{plan.planKey === 'FREE' ? 'Get Started' : 'Sign Up'}</Link>
        </Button>
      );
    }

    if (plan.pricingTBD) {
      return (
        <Button variant="outline" className="pricing-cta-btn" disabled>
          <Hourglass className="h-4 w-4" /> Coming Soon
        </Button>
      );
    }

    const planIndex = PLAN_ORDER.indexOf(plan.planKey);

    if (plan.planKey === subscription.subscription_plan) {
      return (
        <Button variant="outline" className="pricing-cta-btn" disabled>
          ✅ Current Plan
        </Button>
      );
    }

    const isUpgrade = planIndex > currentPlanIndex;

    if (!isUpgrade && !canDowngrade()) {
      return (
        <div style={{ textAlign: 'center' }}>
          <Button variant="outline" className="pricing-cta-btn" disabled>
            <Info className="h-4 w-4 mr-1" /> Downgrade unavailable
          </Button>
          <p style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
            Must request {config.downgrade_cutoff_days}+ days before billing cycle ends
          </p>
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center' }}>
        <Button
          variant={isUpgrade ? 'default' : 'outline'}
          className="pricing-cta-btn"
          disabled={changingPlan !== null}
          onClick={() => handlePlanChange(plan.planKey)}
        >
          {changingPlan === plan.planKey ? 'Processing...' : (
            <>
              {isUpgrade ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
              {isUpgrade ? 'Upgrade' : 'Downgrade'}
            </>
          )}
        </Button>
        {!isUpgrade && (
          <p style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
            Current plan active until billing cycle ends
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="pricing-container">
      {/* Header */}
      <header className="pricing-header">
        <div className="pricing-header-content">
          <div className="pricing-logo">
            <Link to="/" className="pricing-logo-link">
              <div className="pricing-logo-icon" />
              <span className="pricing-logo-text">{APP_NAME}</span>
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

          {/* Early Access Banner */}
          {earlyAccessActive && (
            <div className="pricing-early-access">
              <Gift className="h-5 w-5 text-primary" />
              <div>
                <strong>{config.early_access_headline}</strong>
                <p className="text-sm text-muted-foreground mt-0.5">{config.early_access_description}</p>
              </div>
              <span className="pricing-early-access-timer">
                <Clock className="h-3.5 w-3.5" /> {getDaysRemaining()} days left
              </span>
            </div>
          )}

          {/* Current Plan Display (for logged-in users) */}
          {user && !subLoading && (
            <div className="pricing-current-plan">
              <span className="text-sm text-muted-foreground">Your current plan:</span>
              <span className="pricing-current-plan-badge">{subscription.subscription_plan}</span>
              {(subscription as any).is_trial && (
                <span className="pricing-trial-badge">
                  <Clock className="h-3 w-3" /> Trial
                </span>
              )}
            </div>
          )}

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

          {/* Limited Period Offer - moved above plans */}
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

          {/* Plans Grid */}
          <div className="pricing-grid">
            {plans.map((plan) => {
              const price = plan.pricingTBD
                ? null
                : isYearly
                  ? plan.yearlyPrice
                  : plan.monthlyPrice;
              const period = isYearly ? '/year' : '/month';
              const isCurrentPlan = user && plan.planKey === subscription.subscription_plan;

              return (
                <div
                  key={plan.name}
                  className={`pricing-card ${plan.popular ? 'pricing-card-popular' : ''} ${isCurrentPlan ? 'pricing-card-current' : ''}`}
                >
                  {plan.popular && (
                    <div className="pricing-popular-badge">
                      <Star className="pricing-popular-icon" />
                      Most Popular
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="pricing-current-badge">✅ Your Plan</div>
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
                    {getButtonForPlan(plan)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pricing-footer">
        <div className="pricing-footer-content">
          <div className="pricing-footer-logo">
            <div className="pricing-footer-logo-icon" />
            <span className="pricing-footer-logo-text">{APP_NAME}</span>
          </div>
          <nav className="pricing-footer-nav">
            <Link to="/privacy" className="pricing-footer-link">Privacy Policy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
