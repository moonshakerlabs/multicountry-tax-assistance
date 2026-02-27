import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Loader2 } from 'lucide-react';
import AdminPaymentGatewaySection from './AdminPaymentGatewaySection';

export default function AdminSettingsTab() {
  const { isSuperAdmin } = useAuth();
  const [twoFaGlobal, setTwoFaGlobal] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('subscription_config')
      .select('config_key, config_value')
      .eq('config_key', 'TWO_FA_GLOBAL_ENABLED')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTwoFaGlobal((data as any).config_value === 'true');
        setLoading(false);
      });
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setSaving(true);
    setTwoFaGlobal(enabled);
    try {
      const { error } = await supabase
        .from('subscription_config')
        .update({ config_value: String(enabled) } as any)
        .eq('config_key', 'TWO_FA_GLOBAL_ENABLED');
      if (error) throw error;
      toast.success(`2FA ${enabled ? 'enabled' : 'disabled'} globally`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
      setTwoFaGlobal(!enabled);
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium">No Access</p>
        <p>Only Super Admins can manage global settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Global Settings</h2>
        <p className="text-sm text-muted-foreground">Manage app-wide security and feature settings.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Two-Factor Authentication</h3>
            <p className="text-xs text-muted-foreground">Enable or disable 2FA across the entire application</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Global 2FA</p>
                <p className="text-xs text-muted-foreground">
                  {twoFaGlobal
                    ? 'Users with 2FA feature enabled on their plan can use 2FA'
                    : '2FA is disabled for all users regardless of their plan'}
                </p>
              </div>
              <Switch checked={twoFaGlobal} onCheckedChange={handleToggle} disabled={saving} />
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">
                <strong>How it works:</strong> When enabled, 2FA availability is controlled per plan via the Features toggle in Plans & Pricing.
                Users on plans with the "TWO_FA" feature enabled can activate 2FA in their profile settings.
                When disabled globally, no user can use 2FA regardless of plan.
              </p>
            </div>
          </div>
        )}
      </section>

      <AdminPaymentGatewaySection />
    </div>
  );
}
