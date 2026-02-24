import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useSubscriptionConfig } from '@/hooks/useSubscriptionConfig';
import { usePlanPricing } from '@/hooks/usePlanPricing';
import { supabase } from '@/integrations/supabase/client';
import { Check, X as XIcon, Star, ArrowLeft, Gift, Clock, ArrowUp, ArrowDown, Hourglass, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import './Pricing.css';
import { APP_NAME, APP_TAGLINE } from '@/lib/appConfig';

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
          { text: 'Post 1 question per month', included: true },
          { text: 'Answer unlimited questions', included: true },
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
        ],
      },
      {
        title: 'Connect with Taxpayers Community',
        emoji: '🌍',
        features: [
          { text: 'Select up to 2 countries', included: true },
          { text: '5 questions per country/month (10 total)', included: true },
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
    description: 'Full access with AI-powered features',
    planKey: 'PRO',
    popular: true,
    cta: 'Subscribe',
    sections: [
      {
        title: 'Upload & Document Storage',
        emoji: '📂',
        features: [
          { text: 'All Freemium features', included: true },
          { text: 'Higher storage limits', included: true },
        ],
      },
      {
        title: 'Connect with Taxpayers Community',
        emoji: '🌍',
        features: [
          { text: 'Select up to 5 countries', included: true },
          { text: '10 questions per country/month (50 total)', included: true },
        ],
      },
      {
        title: 'AI Assistant Features',
        emoji: '🤖',
        features: [
          { text: 'Limited AI Assistant access', included: true },
          { text: 'AI-based document analysis', included: true },
          { text: 'AI-generated tax summaries', included: true },
        ],
      },
    ],
  },
  {
    name: 'Super Pro',
    color: '🟡',
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
        ],
      },
      {
        title: 'AI Assistant Features',
        emoji: '🤖',
        features: [
          { text: 'Full AI Assistant access', included: true },
          { text: 'Cross-jurisdiction compliance alignment', included: true },
          { text: 'Automated tax calendar harmonization', included: true },
        ],
      },
    ],
  },
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const { user } = useAuth();
  const { subscription, loading: subLoading, refetch: refetchSub } = useSubscription();
  const { config, isEarlyAccessActive, getDaysRemaining } = useSubscriptionConfig();
  const { getPrice, loading: priceLoading } = usePlanPricing();
  const { toast } = useToast();
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [downgradeModal, setDowngradeModal] = useState<{ open: boolean; targetPlan: string; targetCycle: string }>({ open: false, targetPlan: '', targetCycle: '' });
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; targetPlan: string; targetCycle: string; amountToPay: number; credit: number }>({ open: false, targetPlan: '', targetCycle: '', amountToPay: 0, credit: 0 });

  const currentPlanIndex = PLAN_ORDER.indexOf(subscription.subscription_plan);
  const earlyAccessActive = isEarlyAccessActive();
  const billingCycle = isYearly ? 'YEARLY' : 'MONTHLY';

  const hasScheduledDowngrade = !!(subscription as any).scheduled_plan;

  const getSubData = () => subscription as any;

  const getDaysInCycle = (cycle: string): number => cycle === 'YEARLY' ? 365 : 30;

  const getRemainingDays = (): number => {
    const sub = getSubData();
    if (!sub.subscription_start_date) return 0;
    const start = new Date(sub.subscription_start_date);
    const now = new Date();
    const cycle = sub.billing_cycle || 'MONTHLY';
    let nextBilling = new Date(start);
    if (cycle === 'YEARLY') {
      while (nextBilling <= now) nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    } else {
      while (nextBilling <= now) nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    return Math.max(0, Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getDaysUntilBillingEnd = (): number => getRemainingDays();

  const canDowngrade = (): boolean => {
    const daysLeft = getDaysUntilBillingEnd();
    return daysLeft > config.downgrade_cutoff_days;
  };

  const calculateProration = (targetPlan: string, targetCycle: string) => {
    const sub = getSubData();
    const currentCycle = sub.billing_cycle || 'MONTHLY';
    const currentPrice = getPrice(subscription.subscription_plan, currentCycle);
    const newPrice = getPrice(targetPlan, targetCycle);
    const remainingDays = getRemainingDays();
    const totalDays = getDaysInCycle(currentCycle);
    const remainingCredit = (remainingDays / totalDays) * currentPrice;
    const amountToPay = Math.max(0, newPrice - remainingCredit);
    return { amountToPay: Math.round(amountToPay * 100) / 100, credit: Math.round(remainingCredit * 100) / 100 };
  };

  const handlePlanAction = (targetPlan: string) => {
    if (!user) return;
    if (targetPlan === subscription.subscription_plan && billingCycle === (getSubData().billing_cycle || 'MONTHLY')) {
      toast({ title: 'Same plan', description: 'You are already on this plan with the same billing cycle.', variant: 'destructive' });
      return;
    }
    if (hasScheduledDowngrade) {
      toast({ title: 'Downgrade already scheduled', description: 'You have a pending downgrade. Wait for the current billing cycle to complete.', variant: 'destructive' });
      return;
    }

    const targetIndex = PLAN_ORDER.indexOf(targetPlan);
    const isUpgrade = targetIndex > currentPlanIndex || (targetIndex === currentPlanIndex && isYearly && (getSubData().billing_cycle || 'MONTHLY') === 'MONTHLY');

    if (isUpgrade) {
      const { amountToPay, credit } = calculateProration(targetPlan, billingCycle);
      setUpgradeModal({ open: true, targetPlan, targetCycle: billingCycle, amountToPay, credit });
    } else {
      if (!canDowngrade()) {
        toast({
          title: 'Downgrade not available',
          description: `Downgrades must be requested at least ${config.downgrade_cutoff_days} days before your billing cycle ends.`,
          variant: 'destructive',
        });
        return;
      }
      setDowngradeModal({ open: true, targetPlan, targetCycle: billingCycle });
    }
  };

  const confirmUpgrade = async () => {
    const { targetPlan, targetCycle, amountToPay } = upgradeModal;
    setChangingPlan(targetPlan);
    setUpgradeModal(prev => ({ ...prev, open: false }));

    try {
      if (amountToPay > 0) {
        // Payment gateway placeholder — redirect to payment
        // In production, this would call an edge function that creates a payment session
        // and redirects the user. On success callback, the subscription is updated.
        toast({
          title: '💳 Payment Required',
          description: `Amount: $${amountToPay.toFixed(2)}. Redirecting to payment gateway... (Payment gateway integration pending)`,
          duration: 5000,
        });
        // Simulating successful payment for now — in production, this happens on payment callback
      }

      // Update subscription immediately (or on payment success callback)
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          subscription_plan: targetPlan,
          billing_cycle: targetCycle,
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: null,
          scheduled_plan: null,
          scheduled_billing_cycle: null,
          downgrade_scheduled_at: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user!.id);

      if (error) throw error;

      const price = getPrice(targetPlan, targetCycle);
      await supabase.from('subscription_history').insert({
        user_id: user!.id,
        plan: targetPlan,
        billing_cycle: targetCycle,
        change_type: 'UPGRADE',
        price_at_purchase: price,
        is_legacy_applied: false,
      });

      toast({ title: '🎉 Upgraded!', description: `Your plan has been upgraded to ${targetPlan.replace('_', ' ')}.` });
      refetchSub();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setChangingPlan(null);
    }
  };

  const confirmDowngrade = async () => {
    const { targetPlan, targetCycle } = downgradeModal;
    setChangingPlan(targetPlan);
    setDowngradeModal({ open: false, targetPlan: '', targetCycle: '' });

    try {
      // Schedule the downgrade — don't apply immediately
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          scheduled_plan: targetPlan,
          scheduled_billing_cycle: targetCycle,
          downgrade_scheduled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user!.id);

      if (error) throw error;

      const price = getPrice(targetPlan, targetCycle);
      await supabase.from('subscription_history').insert({
        user_id: user!.id,
        plan: targetPlan,
        billing_cycle: targetCycle,
        change_type: 'DOWNGRADE',
        price_at_purchase: price,
        is_legacy_applied: false,
      });

      const daysLeft = getDaysUntilBillingEnd();
      toast({
        title: 'Downgrade scheduled',
        description: `Your current plan remains active for ${daysLeft} more day(s). The downgrade to ${targetPlan.replace('_', ' ')} will activate when your billing cycle ends.${
          subscription.subscription_plan !== 'FREE' ? ` You'll have ${config.vault_grace_period_days} days to download vault files.` : ''
        }`,
        duration: 8000,
      });
      refetchSub();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setChangingPlan(null);
    }
  };

  const getButtonForPlan = (plan: Plan) => {
    if (!user) {
      if (plan.pricingTBD) {
        return <Button variant="outline" className="pricing-cta-btn" disabled><Hourglass className="h-4 w-4" /> Coming Soon</Button>;
      }
      return (
        <Button asChild variant={plan.popular ? 'default' : 'outline'} className="pricing-cta-btn">
          <Link to="/auth?mode=signup">{plan.planKey === 'FREE' ? 'Get Started' : 'Sign Up'}</Link>
        </Button>
      );
    }

    if (plan.pricingTBD) {
      return <Button variant="outline" className="pricing-cta-btn" disabled><Hourglass className="h-4 w-4" /> Coming Soon</Button>;
    }

    const planIndex = PLAN_ORDER.indexOf(plan.planKey);
    const isSamePlan = plan.planKey === subscription.subscription_plan && billingCycle === (getSubData().billing_cycle || 'MONTHLY');

    if (isSamePlan) {
      return <Button variant="outline" className="pricing-cta-btn" disabled>✅ Current Plan</Button>;
    }

    if (hasScheduledDowngrade) {
      const scheduled = (subscription as any).scheduled_plan;
      if (plan.planKey === scheduled) {
        return <Button variant="outline" className="pricing-cta-btn" disabled>📅 Scheduled</Button>;
      }
      return <Button variant="outline" className="pricing-cta-btn" disabled><Info className="h-4 w-4 mr-1" /> Downgrade pending</Button>;
    }

    const isUpgrade = planIndex > currentPlanIndex || (planIndex === currentPlanIndex && isYearly && (getSubData().billing_cycle || 'MONTHLY') === 'MONTHLY');

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
          onClick={() => handlePlanAction(plan.planKey)}
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
            Active until billing cycle ends
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
              <img src="/images/taxbebo-logo.png" alt={APP_NAME} className="pricing-logo-icon" />
              <span className="pricing-logo-text">{APP_NAME} – {APP_TAGLINE}</span>
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

      <main className="pricing-main">
        <div className="pricing-content">
          <h1 className="pricing-title">Simple, transparent pricing</h1>
          <p className="pricing-subtitle">Choose the plan that fits your cross-border tax needs.</p>

          {/* Current plan display */}
          {user && !subLoading && (
            <div className="pricing-current-plan">
              <span>Your current plan:</span>
              <span className="pricing-current-plan-badge">{subscription.subscription_plan.replace('_', ' ')}</span>
              {(subscription as any).is_trial && (
                <span className="pricing-trial-badge">
                  <Clock className="h-3 w-3" /> Trial
                </span>
              )}
            </div>
          )}

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

          {hasScheduledDowngrade && (
            <div className="pricing-early-access" style={{ borderColor: 'hsl(var(--destructive) / 0.3)', background: 'hsl(var(--destructive) / 0.05)' }}>
              <AlertTriangle className="h-5 w-5" style={{ color: 'hsl(var(--destructive))' }} />
              <div>
                <strong style={{ color: 'hsl(var(--destructive))' }}>Downgrade Scheduled</strong>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your plan will change to {(subscription as any).scheduled_plan?.replace('_', ' ')} after your current billing cycle ends ({getRemainingDays()} days remaining).
                </p>
              </div>
            </div>
          )}

          {/* Billing toggle */}
          <div className="pricing-toggle">
            <span className={`pricing-toggle-label ${!isYearly ? 'active' : ''}`}>Monthly</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`pricing-toggle-label ${isYearly ? 'active' : ''}`}>
              Yearly <span className="pricing-save-badge">Save ~17%</span>
            </span>
          </div>

          {/* Plan cards */}
          <div className="pricing-grid">
            {plans.map((plan) => {
              const price = getPrice(plan.planKey, billingCycle);
              return (
                <div key={plan.planKey} className={`pricing-card ${plan.popular ? 'pricing-card-popular' : ''} ${plan.planKey === subscription.subscription_plan ? 'pricing-card-current' : ''}`}>
                  {plan.popular && <div className="pricing-popular-badge"><Star className="h-3 w-3" /> Most Popular</div>}
                  {plan.planKey === subscription.subscription_plan && <div className="pricing-current-badge">Your Plan</div>}

                  <div className="pricing-card-header">
                    <span className="pricing-card-emoji">{plan.color}</span>
                    <h3 className="pricing-card-name">{plan.name}</h3>
                    <p className="pricing-card-description">{plan.description}</p>
                  </div>

                  <div className="pricing-card-price">
                    {plan.pricingTBD ? (
                      <span className="pricing-price-tbd">TBD</span>
                    ) : (
                      <>
                        <span className="pricing-price-amount">${price}</span>
                        <span className="pricing-price-period">/{isYearly ? 'year' : 'month'}</span>
                      </>
                    )}
                  </div>

                  {getButtonForPlan(plan)}

                  <div className="pricing-card-features">
                    {plan.sections.map((section) => (
                      <div key={section.title} className="pricing-feature-section">
                        <h4 className="pricing-feature-section-title">{section.emoji} {section.title}</h4>
                        <ul className="pricing-feature-list">
                          {section.features.map((feature, fi) => (
                            <li key={fi} className={`pricing-feature-item ${feature.included ? 'included' : 'excluded'}`}>
                              {feature.included ? <Check className="pricing-feature-check" /> : <XIcon className="pricing-feature-x" />}
                              <span>{feature.text}</span>
                              {feature.comingSoon && <span className="pricing-coming-soon">Soon</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legacy Price Notice */}
          <div className="pricing-legacy-notice">
            <div className="pricing-legacy-content">
              <h3 className="pricing-legacy-title">🔒 Early Access Legacy Pricing</h3>
              <p className="pricing-legacy-text">
                Users who subscribe during our <strong>Early Access period</strong> will lock in their current subscription price — even after prices increase in the future.
                This means your rate stays the same as long as your subscription remains active.
              </p>
              <p className="pricing-legacy-text">
                If you cancel and re-subscribe later, you'll be charged the then-current rate.
              </p>
              <p className="pricing-legacy-warning">
                ⚠️ Legacy pricing is only available during Early Access. Don't miss out!
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pricing-footer">
        <div className="pricing-footer-content">
          <div className="pricing-footer-logo">
            <img src="/images/taxbebo-logo.png" alt={APP_NAME} className="pricing-footer-logo-icon" />
            <span className="pricing-footer-logo-text">{APP_NAME}</span>
          </div>
          <nav className="pricing-footer-nav">
            <Link to="/privacy-policy" className="pricing-footer-link">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="pricing-footer-link">Terms</Link>
            <Link to="/support" className="pricing-footer-link">Support</Link>
          </nav>
        </div>
      </footer>

      {/* Upgrade Confirmation Modal */}
      <Dialog open={upgradeModal.open} onOpenChange={(open) => setUpgradeModal(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Upgrade</DialogTitle>
            <DialogDescription>
              You are upgrading to <strong>{upgradeModal.targetPlan.replace('_', ' ')}</strong> ({upgradeModal.targetCycle}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {upgradeModal.credit > 0 && (
              <div className="rounded-lg border p-3 space-y-1">
                <p>💰 <strong>Prorated credit:</strong> ${upgradeModal.credit.toFixed(2)} from your current plan</p>
                <p>💳 <strong>Amount to pay:</strong> ${upgradeModal.amountToPay.toFixed(2)}</p>
              </div>
            )}
            {upgradeModal.amountToPay <= 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-green-800">✅ Your remaining credit covers the upgrade. No payment needed!</p>
              </div>
            )}
            <p className="text-muted-foreground">Your billing cycle will reset upon upgrade.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeModal(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button onClick={confirmUpgrade} disabled={changingPlan !== null}>
              {changingPlan ? 'Processing...' : upgradeModal.amountToPay > 0 ? 'Proceed to Payment' : 'Upgrade Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downgrade Warning Modal */}
      <Dialog open={downgradeModal.open} onOpenChange={(open) => setDowngradeModal(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Confirm Downgrade</DialogTitle>
            <DialogDescription>
              Your downgrade to <strong>{downgradeModal.targetPlan.replace('_', ' ')}</strong> will take effect after your current billing period ends.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="font-medium text-amber-800">Important:</p>
              <ul className="list-disc pl-4 text-amber-700 space-y-1">
                <li>Your current features remain active for <strong>{getRemainingDays()}</strong> more day(s)</li>
                <li>You <strong>cannot revert</strong> this decision until the billing cycle completes</li>
                <li>No refund will be issued for the remaining period</li>
                {subscription.subscription_plan !== 'FREE' && (
                  <li>You'll have <strong>{config.vault_grace_period_days} days</strong> to download any vault files after downgrade activates</li>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDowngradeModal(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDowngrade} disabled={changingPlan !== null}>
              {changingPlan ? 'Processing...' : 'Confirm Downgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
