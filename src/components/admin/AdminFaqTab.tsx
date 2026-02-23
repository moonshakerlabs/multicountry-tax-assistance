import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

type View = 'list' | 'editor';

export default function AdminFaqTab() {
  const { user, isSuperAdmin, userRoles } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({ can_read: false, can_write: false });

  // Editor state
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('General');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
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
      .eq('module', 'faq')
      .maybeSingle();
    if (data) setPermissions(data);
  };

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('faq_items' as any)
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error) setItems((data as any[]) || []);
    setLoading(false);
  };

  const openEditor = (item?: FaqItem) => {
    if (item) {
      setEditingItem(item);
      setQuestion(item.question);
      setAnswer(item.answer);
      setCategory(item.category);
      setIsPublished(item.is_published);
    } else {
      setEditingItem(null);
      setQuestion('');
      setAnswer('');
      setCategory('General');
      setIsPublished(true);
    }
    setView('editor');
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      toast({ title: 'Question and answer are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('faq_items' as any)
          .update({
            question: question.trim(),
            answer: answer.trim(),
            category: category.trim(),
            is_published: isPublished,
            updated_by: user?.id,
          } as any)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: 'FAQ updated' });
      } else {
        const { error } = await supabase
          .from('faq_items' as any)
          .insert({
            question: question.trim(),
            answer: answer.trim(),
            category: category.trim(),
            is_published: isPublished,
            sort_order: items.length,
            created_by: user?.id,
            updated_by: user?.id,
          } as any);
        if (error) throw error;
        toast({ title: 'FAQ created' });
      }
      await fetchItems();
      setView('list');
    } catch (e: any) {
      toast({ title: 'Error saving FAQ', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this FAQ item?')) return;
    const { error } = await supabase.from('faq_items' as any).delete().eq('id', id);
    if (!error) {
      toast({ title: 'FAQ deleted' });
      fetchItems();
    }
  };

  const togglePublished = async (id: string, current: boolean) => {
    await supabase.from('faq_items' as any).update({ is_published: !current, updated_by: user?.id } as any).eq('id', id);
    setItems(items.map(i => i.id === id ? { ...i, is_published: !current } : i));
  };

  if (!permissions.can_read && !isSuperAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium">No Access</p>
        <p>You don't have permission to view the FAQ module.</p>
      </div>
    );
  }

  const canEdit = permissions.can_write || isSuperAdmin;

  if (view === 'editor') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('list')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to FAQ List
        </Button>
        <h3 className="text-xl font-semibold">{editingItem ? 'Edit FAQ' : 'New FAQ Item'}</h3>
        <div className="space-y-3">
          <Input placeholder="Question" value={question} onChange={e => setQuestion(e.target.value)} />
          <Textarea placeholder="Answer (supports markdown)" value={answer} onChange={e => setAnswer(e.target.value)} rows={6} />
          <Input placeholder="Category (e.g. General, Billing, Privacy)" value={category} onChange={e => setCategory(e.target.value)} />
          <div className="flex items-center gap-2">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            <span className="text-sm">Published</span>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save FAQ'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">FAQ Management</h2>
          <p className="text-sm text-muted-foreground">Manage frequently asked questions displayed on the site.</p>
        </div>
        {canEdit && (
          <Button onClick={() => openEditor()}>
            <Plus className="h-4 w-4 mr-1" /> New FAQ
          </Button>
        )}
      </div>

      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading FAQs...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No FAQ items yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Published</TableHead>
                {canEdit && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-xs truncate">{item.question}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted/30">{item.category}</span>
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Switch checked={item.is_published} onCheckedChange={() => togglePublished(item.id, item.is_published)} />
                    ) : (
                      <span className={item.is_published ? 'text-green-600' : 'text-muted-foreground'}>
                        {item.is_published ? 'Yes' : 'No'}
                      </span>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditor(item)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
