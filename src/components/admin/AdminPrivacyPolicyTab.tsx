import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Send } from 'lucide-react';
import { PolicySection } from '@/lib/privacyPolicyData';

export default function AdminPrivacyPolicyTab() {
  const { user, isSuperAdmin, userRoles } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<PolicySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [permissions, setPermissions] = useState({ can_read: false, can_write: false });

  useEffect(() => {
    fetchPolicy();
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    if (isSuperAdmin) {
      setPermissions({ can_read: true, can_write: true });
      return;
    }
    const currentRole = userRoles.find(r => ['employee_admin', 'user_admin'].includes(r));
    if (!currentRole) return;
    const { data } = await supabase
      .from('role_permissions')
      .select('can_read, can_write')
      .eq('role', currentRole as any)
      .eq('module', 'privacy_policy')
      .maybeSingle();
    if (data) setPermissions(data);
  };

  const fetchPolicy = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('privacy_policy_versions' as any)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && (data as any).content) {
      setSections((data as any).content as PolicySection[]);
    } else {
      // Load from static data as starting point
      const { privacyPolicyPageData } = await import('@/lib/privacyPolicyData');
      setSections(privacyPolicyPageData.sections);
    }
    setLoading(false);
  };

  const addSection = (type: PolicySection['type']) => {
    const newSection: PolicySection = {
      type,
      content: type === 'bullets' ? [''] : '',
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (index: number, content: string | string[]) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], content };
    setSections(updated);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSections(updated);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Deactivate existing
      await supabase
        .from('privacy_policy_versions' as any)
        .update({ is_active: false } as any)
        .eq('is_active', true);

      // Insert new version
      const { error } = await supabase
        .from('privacy_policy_versions' as any)
        .insert({
          content: sections as any,
          updated_by: user.id,
          is_active: true,
          published_at: new Date().toISOString(),
        } as any);

      if (error) throw error;
      toast({ title: 'Privacy policy saved successfully' });
    } catch (e: any) {
      toast({ title: 'Error saving', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishAndNotify = async () => {
    if (!user) return;
    setPublishing(true);
    try {
      await handleSave();
      // Trigger email notification
      const { error } = await supabase.functions.invoke('notify-privacy-update', {});
      if (error) throw error;
      toast({ title: 'Privacy policy published and users notified via email' });
    } catch (e: any) {
      toast({ title: 'Policy saved, but email notification failed', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  if (!permissions.can_read && !isSuperAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium">No Access</p>
        <p>You don't have permission to view the Privacy Policy module.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading privacy policy...</div>;
  }

  const canEdit = permissions.can_write || isSuperAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Privacy Policy</h2>
          <p className="text-sm text-muted-foreground">Manage and update the privacy policy content.</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} variant="outline">
              <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={handlePublishAndNotify} disabled={publishing}>
              <Send className="h-4 w-4 mr-1" /> {publishing ? 'Publishing...' : 'Publish & Notify Users'}
            </Button>
          </div>
        )}
      </div>

      {/* Section list */}
      <div className="space-y-3">
        {sections.map((section, index) => (
          <div key={index} className="card-elevated p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.type}
              </span>
              {canEdit && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => moveSection(index, 'up')} disabled={index === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeSection(index)} className="text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {section.type === 'bullets' ? (
              <div className="space-y-2">
                {(section.content as string[]).map((item, bi) => (
                  <div key={bi} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const bullets = [...(section.content as string[])];
                        bullets[bi] = e.target.value;
                        updateSection(index, bullets);
                      }}
                      disabled={!canEdit}
                      className="text-sm"
                    />
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        const bullets = (section.content as string[]).filter((_, i) => i !== bi);
                        updateSection(index, bullets);
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => {
                    updateSection(index, [...(section.content as string[]), '']);
                  }}>
                    <Plus className="h-3 w-3 mr-1" /> Add bullet
                  </Button>
                )}
              </div>
            ) : section.type === 'paragraph' ? (
              <Textarea
                value={section.content as string}
                onChange={(e) => updateSection(index, e.target.value)}
                disabled={!canEdit}
                rows={3}
                className="text-sm"
              />
            ) : (
              <Input
                value={section.content as string}
                onChange={(e) => updateSection(index, e.target.value)}
                disabled={!canEdit}
                className={section.type === 'heading' ? 'font-bold text-base' : 'font-semibold text-sm'}
              />
            )}
          </div>
        ))}
      </div>

      {/* Add section buttons */}
      {canEdit && (
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => addSection('heading')}>
            <Plus className="h-3 w-3 mr-1" /> Heading
          </Button>
          <Button variant="outline" size="sm" onClick={() => addSection('subheading')}>
            <Plus className="h-3 w-3 mr-1" /> Subheading
          </Button>
          <Button variant="outline" size="sm" onClick={() => addSection('paragraph')}>
            <Plus className="h-3 w-3 mr-1" /> Paragraph
          </Button>
          <Button variant="outline" size="sm" onClick={() => addSection('bullets')}>
            <Plus className="h-3 w-3 mr-1" /> Bullet List
          </Button>
        </div>
      )}
    </div>
  );
}
