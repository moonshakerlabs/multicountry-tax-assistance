import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Star, ArrowLeft, Loader2, CheckCircle, Send } from 'lucide-react';
import { APP_NAME } from '@/lib/appConfig';

interface FeedbackQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  sort_order: number;
}

export default function Feedback() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [existingResponses, setExistingResponses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: qs } = await supabase
        .from('feedback_questions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      setQuestions((qs as any[]) || []);

      if (user) {
        const { data: rs } = await supabase
          .from('feedback_responses')
          .select('question_id')
          .eq('user_id', user.id);
        const answered = new Set((rs || []).map((r: any) => r.question_id));
        setExistingResponses(answered);
        // If all questions already answered
        if (qs && qs.length > 0 && qs.every((q: any) => answered.has(q.id))) {
          setSubmitted(true);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const unansweredQuestions = questions.filter(q => !existingResponses.has(q.id));

  const handleSubmit = async () => {
    if (!user) { toast.error('Please sign in to submit feedback'); return; }
    const unanswered = unansweredQuestions.filter(q => !answers[q.id]);
    if (unanswered.length) { toast.error('Please answer all questions'); return; }

    setSubmitting(true);
    try {
      const inserts = unansweredQuestions.map(q => {
        const val = answers[q.id];
        return {
          user_id: user.id,
          question_id: q.id,
          rating: q.question_type === 'rating' ? val : null,
          selected_option: q.question_type === 'multiple_choice' ? val : null,
          text_response: q.question_type === 'text' ? val : null,
        };
      });
      const { error } = await supabase.from('feedback_responses').insert(inserts);
      if (error) throw error;
      toast.success('Thank you for your feedback!');
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Thank You!</h1>
          <p className="text-muted-foreground">Your feedback has been submitted successfully. We appreciate your time and input!</p>
          <Button asChild variant="outline"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No feedback questions available at this time.</p>
          <Button asChild variant="outline"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Share Your Feedback</h1>
            <p className="text-sm text-muted-foreground">Help us improve {APP_NAME}</p>
          </div>
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {unansweredQuestions.map((q, idx) => (
          <div key={q.id} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <p className="text-sm font-medium text-foreground">{idx + 1}. {q.question_text}</p>

            {q.question_type === 'rating' && (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: star }))}
                    className="p-1 transition-colors"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${(answers[q.id] || 0) >= star ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`}
                    />
                  </button>
                ))}
              </div>
            )}

            {q.question_type === 'multiple_choice' && q.options?.length > 0 && (
              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                      answers[q.id] === opt
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.question_type === 'text' && (
              <Textarea
                placeholder="Type your response..."
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                rows={3}
              />
            )}
          </div>
        ))}

        <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Submit Feedback
        </Button>
      </main>
    </div>
  );
}
