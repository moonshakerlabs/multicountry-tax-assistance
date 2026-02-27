import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, ArrowLeft, ChevronRight, X, Check } from 'lucide-react';

interface PlanPricing {
  id: string;
  plan_key: string;
  billing_cycle: string;
  price: number;
  currency: string;
  is_active: boolean;
}

interface FeatureMapping {
  id: string;
  plan_key: string;
  feature_key: string;
  enabled: boolean;
}

interface Feature {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
}

const BILLING_CYCLES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half Yearly' },
  { value: 'YEARLY', label: 'Yearly' },
];

type View = 'list' | 'add-plan' | 'edit-plan' | 'plan-features';

export default function AdminPlanManagementTab() {
  const { user, isSuperAdmin, userRoles } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<View>('list');
  const [plans, setPlans] = useState<PlanPricing[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featureMappings, setFeatureMappings] = useState<FeatureMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({ can_read: false, can_write: false });

  // Form state
  const [editPlanKey, setEditPlanKey] = useState('');
  const [planName, setPlanName] = useState('');
  const [planPrices, setPlanPrices] = useState<{ cycle: string; price: string; active: boolean }[]>(
    BILLING_CYCLES.map(c => ({ cycle: c.value, price: '', active: true }))
  );
  const [planCurrency, setPlanCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);

  // Feature view state
  const [selectedPlanKey, setSelectedPlanKey] = useState('');

  useEffect(() => {
    fetchData();
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    if (isSuperAdmin) { setPermissions({ can_read: true, can_write: true }); return; }
    const currentRole = userRoles.find(r => ['employee_admin', 'user_admin'].includes(r));
    if (!currentRole) return;
    const { data } = await supabase.from('role_permissions').select('can_read, can_write').eq('role', currentRole as any).eq('module', 'offers').maybeSingle();
    if (data) setPermissions(data);
  };

  const fetchData = async () => {
    setLoading(true);
    const [pricingRes, featuresRes, mappingsRes] = await Promise.all([
      supabase.from('plan_pricing').select('*').order('plan_key'),
      supabase.from('plan_features').select('*').order('feature_name'),
      supabase.from('plan_feature_mapping').select('*'),
    ]);
    setPlans((pricingRes.data as PlanPricing[]) || []);
    setFeatures((featuresRes.data as Feature[]) || []);
    setFeatureMappings((mappingsRes.data as FeatureMapping[]) || []);
    setLoading(false);
  };

  // Get unique plan keys
  const uniquePlanKeys = [...new Set(plans.map(p => p.plan_key))];

  const openAddPlan = () => {
    setEditPlanKey('');
    setPlanName('');
    setPlanPrices(BILLING_CYCLES.map(c => ({ cycle: c.value, price: '', active: true })));
    setPlanCurrency('USD');
    setView('add-plan');
  };

  const openEditPlan = (planKey: string) => {
    setEditPlanKey(planKey);
    setPlanName(planKey);
    const existing = plans.filter(p => p.plan_key === planKey);
    setPlanPrices(BILLING_CYCLES.map(c => {
      const match = existing.find(p => p.billing_cycle === c.value);
      return { cycle: c.value, price: match ? String(match.price) : '', active: match?.is_active ?? true };
    }));
    setPlanCurrency(existing[0]?.currency || 'USD');
    setView('edit-plan');
  };

  const openPlanFeatures = (planKey: string) => {
    setSelectedPlanKey(planKey);
    setView('plan-features');
  };

  const handleSavePlan = async () => {
    const key = planName.trim().toUpperCase().replace(/\s+/g, '_');
    if (!key) { toast({ title: 'Plan name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      // If editing, delete old entries first
      if (editPlanKey && editPlanKey !== key) {
        await supabase.from('plan_pricing').delete().eq('plan_key', editPlanKey);
        // Update feature mappings to new key
        await supabase.from('plan_feature_mapping').update({ plan_key: key } as any).eq('plan_key', editPlanKey);
      }

      // Upsert pricing for each billing cycle that has a price
      for (const pp of planPrices) {
        const price = parseFloat(pp.price);
        if (isNaN(price) && !editPlanKey) continue; // skip empty new entries

        const existing = plans.find(p => p.plan_key === (editPlanKey || key) && p.billing_cycle === pp.cycle);
        if (existing) {
          await supabase.from('plan_pricing').update({
            plan_key: key,
            price: isNaN(price) ? 0 : price,
            is_active: pp.active,
            currency: planCurrency,
          } as any).eq('id', existing.id);
        } else if (!isNaN(price)) {
          await supabase.from('plan_pricing').insert({
            plan_key: key,
            billing_cycle: pp.cycle,
            price,
            is_active: pp.active,
            currency: planCurrency,
          } as any);
        }
      }

      toast({ title: editPlanKey ? 'Plan updated' : 'Plan created' });
      await fetchData();
      setView('list');
    } catch (err: any) {
      toast({ title: 'Error saving plan', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planKey: string) => {
    if (!confirm(`Delete the plan "${planKey}" and all its pricing? This cannot be undone.`)) return;
    try {
      await supabase.from('plan_pricing').delete().eq('plan_key', planKey);
      await supabase.from('plan_feature_mapping').delete().eq('plan_key', planKey);
      toast({ title: 'Plan deleted' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error deleting plan', description: err.message, variant: 'destructive' });
    }
  };

  const toggleFeature = async (featureKey: string, currentlyEnabled: boolean) => {
    const existing = featureMappings.find(m => m.plan_key === selectedPlanKey && m.feature_key === featureKey);
    try {
      if (existing) {
        await supabase.from('plan_feature_mapping').update({ enabled: !currentlyEnabled } as any).eq('id', existing.id);
      } else {
        await supabase.from('plan_feature_mapping').insert({ plan_key: selectedPlanKey, feature_key: featureKey, enabled: true } as any);
      }
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Error updating feature', description: err.message, variant: 'destructive' });
    }
  };

  if (!permissions.can_read && !isSuperAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium">No Access</p>
        <p>You don't have permission to view Plan Management.</p>
      </div>
    );
  }

  const canEdit = permissions.can_write || isSuperAdmin;

  // ── Plan Features View ──
  if (view === 'plan-features') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('list')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Plans
        </Button>
        <h3 className="text-xl font-semibold">Features for: <span className="text-primary">{selectedPlanKey}</span></h3>
        <p className="text-sm text-muted-foreground">Toggle features on or off for this plan.</p>

        {features.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">No features defined yet. Add features in the Features module first.</p>
        ) : (
          <div className="space-y-2">
            {features.map(feature => {
              const mapping = featureMappings.find(m => m.plan_key === selectedPlanKey && m.feature_key === feature.feature_key);
              const isEnabled = mapping?.enabled ?? false;
              return (
                <div key={feature.feature_key} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{feature.feature_name}</p>
                    {feature.description && <p className="text-xs text-muted-foreground">{feature.description}</p>}
                    <p className="text-xs text-muted-foreground font-mono">{feature.feature_key}</p>
                  </div>
                  {canEdit ? (
                    <Switch checked={isEnabled} onCheckedChange={() => toggleFeature(feature.feature_key, isEnabled)} />
                  ) : (
                    <span className={isEnabled ? 'text-green-600 text-sm' : 'text-muted-foreground text-sm'}>
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Add/Edit Plan View ──
  if (view === 'add-plan' || view === 'edit-plan') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('list')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Plans
        </Button>
        <h3 className="text-xl font-semibold">{view === 'edit-plan' ? 'Edit Plan' : 'Add New Plan'}</h3>

        <div className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Plan Name</Label>
            <Input
              placeholder="e.g. PRO, SUPER_PRO, ENTERPRISE"
              value={planName}
              onChange={e => setPlanName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Will be stored as uppercase with underscores (e.g. SUPER_PRO)</p>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <select value={planCurrency} onChange={e => setPlanCurrency(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="INR">INR (₹)</option>
              <option value="AED">AED (د.إ)</option>
            </select>
          </div>

          <div className="space-y-3">
            <Label>Pricing per Billing Cycle</Label>
            {planPrices.map((pp, idx) => {
              const cycleLabel = BILLING_CYCLES.find(c => c.value === pp.cycle)?.label || pp.cycle;
              return (
                <div key={pp.cycle} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                  <span className="text-sm font-medium min-w-[100px]">{cycleLabel}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    value={pp.price}
                    onChange={e => {
                      const updated = [...planPrices];
                      updated[idx].price = e.target.value;
                      setPlanPrices(updated);
                    }}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={pp.active}
                      onCheckedChange={v => {
                        const updated = [...planPrices];
                        updated[idx].active = v;
                        setPlanPrices(updated);
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Active</span>
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={handleSavePlan} disabled={saving} className="w-full">
            {saving ? 'Saving...' : view === 'edit-plan' ? 'Update Plan' : 'Create Plan'}
          </Button>
        </div>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plan Management</h2>
          <p className="text-sm text-muted-foreground">Add, edit, or remove subscription plans and manage their features and pricing.</p>
        </div>
        {canEdit && (
          <Button onClick={openAddPlan}>
            <Plus className="h-4 w-4 mr-1" /> Add Plan
          </Button>
        )}
      </div>

      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading plans...</div>
        ) : uniquePlanKeys.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No plans defined yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Quarterly</TableHead>
                <TableHead>Half Yearly</TableHead>
                <TableHead>Yearly</TableHead>
                <TableHead>Features</TableHead>
                {canEdit && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniquePlanKeys.map(planKey => {
                const planEntries = plans.filter(p => p.plan_key === planKey);
                const getPrice = (cycle: string) => {
                  const entry = planEntries.find(p => p.billing_cycle === cycle);
                  if (!entry) return <span className="text-muted-foreground text-xs">—</span>;
                  return (
                    <span className={entry.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}>
                      {entry.currency === 'USD' ? '$' : entry.currency === 'EUR' ? '€' : entry.currency === 'INR' ? '₹' : ''}{entry.price}
                    </span>
                  );
                };
                const featureCount = featureMappings.filter(m => m.plan_key === planKey && m.enabled).length;
                return (
                  <TableRow key={planKey}>
                    <TableCell className="font-semibold">{planKey}</TableCell>
                    <TableCell>{getPrice('MONTHLY')}</TableCell>
                    <TableCell>{getPrice('QUARTERLY')}</TableCell>
                    <TableCell>{getPrice('HALF_YEARLY')}</TableCell>
                    <TableCell>{getPrice('YEARLY')}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openPlanFeatures(planKey)} className="text-primary">
                        {featureCount} features <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditPlan(planKey)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeletePlan(planKey)} className="text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
