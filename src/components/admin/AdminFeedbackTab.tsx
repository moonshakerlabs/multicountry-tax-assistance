import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Save, X, Loader2, Star, MessageSquare, List, BarChart3 } from 'lucide-react';

interface FeedbackQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface FeedbackResponse {
  id: string;
  user_id: string;
  question_id: string;
  rating: number | null;
  selected_option: string | null;
  text_response: string | null;
  created_at: string;
}

export default function AdminFeedbackTab() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'questions' | 'responses'>('questions');

  // New question form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formText, setFormText] = useState('');
  const [formType, setFormType] = useState<string>('rating');
  const [formOptions, setFormOptions] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [qRes, rRes] = await Promise.all([
      supabase.from('feedback_questions').select('*').order('sort_order'),
      supabase.from('feedback_responses').select('*').order('created_at', { ascending: false }),
    ]);
    setQuestions((qRes.data as any[]) || []);
    setResponses((rRes.data as any[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setFormText('');
    setFormType('rating');
    setFormOptions(['']);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formText.trim()) { toast.error('Question text is required'); return; }
    if (formType === 'multiple_choice' && formOptions.filter(o => o.trim()).length < 2) {
      toast.error('Add at least 2 options'); return;
    }
    setSaving(true);
    const payload: any = {
      question_text: formText.trim(),
      question_type: formType,
      options: formType === 'multiple_choice' ? formOptions.filter(o => o.trim()) : [],
      sort_order: questions.length,
      created_by: user!.id,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('feedback_questions').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Question updated');
      } else {
        const { error } = await supabase.from('feedback_questions').insert(payload);
        if (error) throw error;
        toast.success('Question added');
      }
      resetForm();
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (q: FeedbackQuestion) => {
    setFormText(q.question_text);
    setFormType(q.question_type);
    setFormOptions(q.options?.length ? q.options : ['']);
    setEditingId(q.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question? All responses will also be deleted.')) return;
    await supabase.from('feedback_questions').delete().eq('id', id);
    toast.success('Question deleted');
    fetchData();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('feedback_questions').update({ is_active: active } as any).eq('id', id);
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: active } : q));
  };

  const getResponsesForQuestion = (qId: string) => responses.filter(r => r.question_id === qId);

  const getAvgRating = (qId: string) => {
    const rs = getResponsesForQuestion(qId).filter(r => r.rating !== null);
    if (!rs.length) return 0;
    return (rs.reduce((sum, r) => sum + (r.rating || 0), 0) / rs.length).toFixed(1);
  };

  const getOptionCounts = (qId: string) => {
    const rs = getResponsesForQuestion(qId).filter(r => r.selected_option);
    const counts: Record<string, number> = {};
    rs.forEach(r => { counts[r.selected_option!] = (counts[r.selected_option!] || 0) + 1; });
    return counts;
  };

  if (loading) return <div className="flex items-center gap-2 p-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Feedback Management</h2>
          <p className="text-sm text-muted-foreground">Create questions and view user feedback responses.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeView === 'questions' ? 'default' : 'outline'} size="sm" onClick={() => setActiveView('questions')}>
            <List className="h-4 w-4 mr-1" /> Questions
          </Button>
          <Button variant={activeView === 'responses' ? 'default' : 'outline'} size="sm" onClick={() => setActiveView('responses')}>
            <BarChart3 className="h-4 w-4 mr-1" /> Responses ({responses.length})
          </Button>
        </div>
      </div>

      {activeView === 'questions' && (
        <div className="space-y-4">
          <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Question
          </Button>

          {showForm && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="font-semibold text-foreground">{editingId ? 'Edit Question' : 'New Question'}</h3>
              <Input placeholder="Question text..." value={formText} onChange={e => setFormText(e.target.value)} />
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">⭐ Rating (1-5)</SelectItem>
                  <SelectItem value="multiple_choice">📋 Multiple Choice</SelectItem>
                  <SelectItem value="text">💬 Text Response</SelectItem>
                </SelectContent>
              </Select>
              {formType === 'multiple_choice' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Options:</p>
                  {formOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={opt} onChange={e => { const n = [...formOptions]; n[i] = e.target.value; setFormOptions(n); }} placeholder={`Option ${i + 1}`} />
                      {formOptions.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => setFormOptions(formOptions.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setFormOptions([...formOptions, ''])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Option
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  {editingId ? 'Update' : 'Save'}
                </Button>
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              </div>
            </div>
          )}

          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No feedback questions yet. Add your first question above.</p>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                      {q.question_type === 'rating' && <Star className="h-3.5 w-3.5 text-yellow-500" />}
                      {q.question_type === 'multiple_choice' && <List className="h-3.5 w-3.5 text-blue-500" />}
                      {q.question_type === 'text' && <MessageSquare className="h-3.5 w-3.5 text-green-500" />}
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">{q.question_type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                    {q.question_type === 'multiple_choice' && q.options?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {q.options.map((o, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{o}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{getResponsesForQuestion(q.id).length} responses</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={q.is_active} onCheckedChange={(v) => handleToggleActive(q.id, v)} />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(q)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'responses' && (
        <div className="space-y-4">
          {questions.map(q => {
            const qResponses = getResponsesForQuestion(q.id);
            if (!qResponses.length) return null;
            return (
              <div key={q.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="font-semibold text-foreground text-sm">{q.question_text}</h3>
                {q.question_type === 'rating' && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-lg font-bold text-foreground">{getAvgRating(q.id)}</span>
                    <span className="text-xs text-muted-foreground">avg from {qResponses.length} responses</span>
                  </div>
                )}
                {q.question_type === 'multiple_choice' && (
                  <div className="space-y-1">
                    {Object.entries(getOptionCounts(q.id)).map(([opt, count]) => (
                      <div key={opt} className="flex items-center gap-2 text-sm">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${(count / qResponses.length) * 100}%`, minWidth: 8 }} />
                        <span className="text-foreground">{opt}</span>
                        <span className="text-xs text-muted-foreground">({count})</span>
                      </div>
                    ))}
                  </div>
                )}
                {q.question_type === 'text' && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {qResponses.filter(r => r.text_response).map(r => (
                      <p key={r.id} className="text-xs text-muted-foreground border-l-2 border-border pl-3">{r.text_response}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {responses.length === 0 && <p className="text-sm text-muted-foreground p-4">No feedback responses yet.</p>}
        </div>
      )}
    </div>
  );
}
