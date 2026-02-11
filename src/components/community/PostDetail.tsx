import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ThumbsUp, ThumbsDown, CheckCircle, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import './PostDetail.css';

interface AnswerData {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  vote_count: number;
  is_correct: boolean;
  status: string;
  created_at: string;
  author_email?: string;
  user_vote?: 'UP' | 'DOWN' | null;
}

interface PostDetailProps {
  postId: string;
  onBack: () => void;
  onVotePost: (postId: string, voteType: 'UP' | 'DOWN') => void;
  onReport: (entityId: string, entityType: 'POST' | 'ANSWER') => void;
}

export default function PostDetail({ postId, onBack, onVotePost, onReport }: PostDetailProps) {
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [answers, setAnswers] = useState<AnswerData[]>([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', postId)
      .single();
    if (data) {
      // Fetch author email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', data.user_id)
        .maybeSingle();

      // Fetch user's vote on this post
      let userVote = null;
      if (user) {
        const { data: voteData } = await supabase
          .from('community_votes')
          .select('vote_type')
          .eq('user_id', user.id)
          .eq('entity_id', data.id)
          .eq('entity_type', 'POST')
          .maybeSingle();
        userVote = voteData?.vote_type || null;
      }

      setPost({ ...data, author_email: profile?.email, user_vote: userVote });
    }
    setLoading(false);
  }, [postId, user]);

  const fetchAnswers = useCallback(async () => {
    const { data } = await supabase
      .from('community_answers')
      .select('*')
      .eq('post_id', postId)
      .eq('status', 'ACTIVE')
      .order('is_correct', { ascending: false })
      .order('vote_count', { ascending: false });

    if (data && user) {
      // Fetch votes for answers
      const answerIds = data.map((a) => a.id);
      const { data: votes } = await supabase
        .from('community_votes')
        .select('entity_id, vote_type')
        .eq('user_id', user.id)
        .eq('entity_type', 'ANSWER')
        .in('entity_id', answerIds.length > 0 ? answerIds : ['none']);

      const voteMap = new Map(votes?.map((v) => [v.entity_id, v.vote_type]) || []);

      // Fetch author emails
      const userIds = [...new Set(data.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds.length > 0 ? userIds : ['none']);
      const emailMap = new Map(profiles?.map((p) => [p.id, p.email]) || []);

      setAnswers(
        data.map((a) => ({
          ...a,
          author_email: emailMap.get(a.user_id),
          user_vote: (voteMap.get(a.id) as 'UP' | 'DOWN') || null,
        }))
      );
    } else if (data) {
      setAnswers(data.map((a) => ({ ...a, user_vote: null })));
    }
  }, [postId, user]);

  useEffect(() => {
    fetchPost();
    fetchAnswers();
  }, [fetchPost, fetchAnswers]);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAnswer.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from('community_answers').insert({
      post_id: postId,
      user_id: user.id,
      content: newAnswer.trim(),
    });

    if (!error) {
      // Update answer count
      await supabase
        .from('community_posts')
        .update({ answer_count: (post?.answer_count || 0) + 1 })
        .eq('id', postId);

      setNewAnswer('');
      fetchAnswers();
      fetchPost();
      toast({ title: 'Answer posted successfully' });
    } else {
      toast({ title: 'Error posting answer', description: error.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleVoteAnswer = async (answerId: string, voteType: 'UP' | 'DOWN') => {
    if (!user) return;
    const answer = answers.find((a) => a.id === answerId);
    if (answer?.user_id === user.id) return;

    const existing = answer?.user_vote;
    if (existing === voteType) {
      // Remove vote
      await supabase
        .from('community_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('entity_id', answerId)
        .eq('entity_type', 'ANSWER');

      const delta = voteType === 'UP' ? -1 : 1;
      await supabase
        .from('community_answers')
        .update({ vote_count: (answer?.vote_count || 0) + delta })
        .eq('id', answerId);
    } else if (existing) {
      // Change vote
      await supabase
        .from('community_votes')
        .update({ vote_type: voteType })
        .eq('user_id', user.id)
        .eq('entity_id', answerId)
        .eq('entity_type', 'ANSWER');

      const delta = voteType === 'UP' ? 2 : -2;
      await supabase
        .from('community_answers')
        .update({ vote_count: (answer?.vote_count || 0) + delta })
        .eq('id', answerId);
    } else {
      // New vote
      await supabase.from('community_votes').insert({
        user_id: user.id,
        entity_id: answerId,
        entity_type: 'ANSWER',
        vote_type: voteType,
      });

      const delta = voteType === 'UP' ? 1 : -1;
      await supabase
        .from('community_answers')
        .update({ vote_count: (answer?.vote_count || 0) + delta })
        .eq('id', answerId);
    }

    fetchAnswers();
  };

  const handleMarkCorrect = async (answerId: string) => {
    if (!user || post?.user_id !== user.id) return;

    // Unmark all others
    await supabase
      .from('community_answers')
      .update({ is_correct: false })
      .eq('post_id', postId);

    // Mark selected
    await supabase
      .from('community_answers')
      .update({ is_correct: true })
      .eq('id', answerId);

    fetchAnswers();
    toast({ title: 'Answer marked as correct' });
  };

  if (loading) {
    return <div className="post-detail-loading">Loading...</div>;
  }

  if (!post) {
    return <div className="post-detail-loading">Post not found</div>;
  }

  return (
    <div className="post-detail">
      <Button variant="ghost" size="sm" onClick={onBack} className="post-detail-back">
        <ArrowLeft className="post-detail-back-icon" />
        Back to Questions
      </Button>

      <div className="post-detail-card">
        <div className="post-detail-header">
          <Badge variant="outline">{post.country}</Badge>
          <span className="post-detail-time">{new Date(post.created_at).toLocaleDateString()}</span>
          <span className="post-detail-author">by {post.author_email || 'Anonymous'}</span>
        </div>
        <h2 className="post-detail-title">{post.title}</h2>
        <p className="post-detail-description">{post.description}</p>
        {post.tags?.length > 0 && (
          <div className="post-detail-tags">
            {post.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}
        <div className="post-detail-actions">
          <div className="post-detail-votes">
            <Button
              variant="ghost"
              size="sm"
              className={post.user_vote === 'UP' ? 'post-vote-active-up' : ''}
              onClick={() => onVotePost(post.id, 'UP')}
              disabled={post.user_id === user?.id}
            >
              <ThumbsUp className="post-vote-icon" />
            </Button>
            <span className="post-vote-count">{post.vote_count}</span>
            <Button
              variant="ghost"
              size="sm"
              className={post.user_vote === 'DOWN' ? 'post-vote-active-down' : ''}
              onClick={() => onVotePost(post.id, 'DOWN')}
              disabled={post.user_id === user?.id}
            >
              <ThumbsDown className="post-vote-icon" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onReport(post.id, 'POST')}>
            <Flag className="post-report-icon" />
            Report
          </Button>
        </div>
      </div>

      {/* Answers Section */}
      <div className="post-detail-answers-header">
        <h3>{answers.length} Answer{answers.length !== 1 ? 's' : ''}</h3>
      </div>

      {answers.map((answer) => (
        <div key={answer.id} className={`post-detail-answer ${answer.is_correct ? 'post-detail-answer-correct' : ''}`}>
          {answer.is_correct && (
            <div className="answer-correct-badge">
              <CheckCircle className="answer-correct-icon" />
              Accepted Answer
            </div>
          )}
          <p className="answer-content">{answer.content}</p>
          <div className="answer-footer">
            <div className="answer-votes">
              <Button
                variant="ghost"
                size="sm"
                className={answer.user_vote === 'UP' ? 'post-vote-active-up' : ''}
                onClick={() => handleVoteAnswer(answer.id, 'UP')}
                disabled={answer.user_id === user?.id}
              >
                <ThumbsUp className="post-vote-icon" />
              </Button>
              <span className="post-vote-count">{answer.vote_count}</span>
              <Button
                variant="ghost"
                size="sm"
                className={answer.user_vote === 'DOWN' ? 'post-vote-active-down' : ''}
                onClick={() => handleVoteAnswer(answer.id, 'DOWN')}
                disabled={answer.user_id === user?.id}
              >
                <ThumbsDown className="post-vote-icon" />
              </Button>
            </div>
            <div className="answer-meta">
              <span className="answer-author">{answer.author_email || 'Anonymous'}</span>
              <span className="answer-time">{new Date(answer.created_at).toLocaleDateString()}</span>
              {post.user_id === user?.id && !answer.is_correct && (
                <Button variant="outline" size="sm" onClick={() => handleMarkCorrect(answer.id)}>
                  <CheckCircle className="answer-mark-icon" />
                  Mark Correct
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onReport(answer.id, 'ANSWER')}>
                <Flag className="post-report-icon" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Post Answer Form */}
      {user && (
        <form onSubmit={handleSubmitAnswer} className="post-detail-answer-form">
          <h4 className="answer-form-title">Your Answer</h4>
          <Textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Write your answer..."
            rows={4}
            required
          />
          <div className="answer-form-actions">
            <Button type="submit" disabled={submitting || !newAnswer.trim()}>
              {submitting ? 'Posting...' : 'Post Answer'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
