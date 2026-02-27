import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, Loader2, Save } from 'lucide-react';

const GATEWAYS = [
  { key: 'RAZORPAY', label: 'RazorPay', description: 'Popular in India, supports UPI, cards, wallets.' },
  { key: 'STRIPE', label: 'Stripe', description: 'Global payment processing, supports 135+ currencies.' },
  { key: 'PAYPAL', label: 'PayPal', description: 'Widely used worldwide for online payments.' },
];

export default function AdminPaymentGatewaySection() {
  const [gateway, setGateway] = useState('RAZORPAY');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('subscription_config')
      .select('config_value')
      .eq('config_key', 'PAYMENT_GATEWAY')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setGateway((data as any).config_value);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('subscription_config')
        .update({ config_value: gateway } as any)
        .eq('config_key', 'PAYMENT_GATEWAY');
      if (error) throw error;
      toast.success(`Payment gateway set to ${gateway}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedGateway = GATEWAYS.find(g => g.key === gateway);

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <CreditCard className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Payment Gateway</h3>
          <p className="text-xs text-muted-foreground">Select the active payment provider for the platform</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Select value={gateway} onValueChange={setGateway}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GATEWAYS.map(g => (
                    <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
          {selectedGateway && (
            <p className="text-xs text-muted-foreground">{selectedGateway.description}</p>
          )}
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Changing the payment gateway will affect all future transactions.
              Ensure the selected gateway's API keys are configured before accepting payments.
              Existing subscriptions will continue on their original gateway until renewal.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
