import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lock, MessageSquare, ThumbsUp, ThumbsDown, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import './SharedPost.css';

interface Post {
  id: string;
  country: string;
  title: string;
  description: string;
  tags: string[];
  vote_count: number;
  answer_count: number;
  created_at: string;
  has_correct_answer?: boolean;
}

export default function SharedPost() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('id, country, title, description, tags, vote_count, answer_count, created_at')
        .eq('id', postId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Check for correct answer
      const { data: correctAnswers } = await supabase
        .from('community_answers')
        .select('post_id')
        .eq('is_correct', true)
        .eq('post_id', data.id);

      setPost({
        ...data,
        tags: data.tags || [],
        has_correct_answer: (correctAnswers?.length || 0) > 0,
      });
      setLoading(false);
    })();
  }, [postId]);

  const getTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div className="shared-post-container">
      <header className="shared-post-header">
        <div className="shared-post-header-content">
          <Link to="/taxoverflow" className="shared-post-logo-link">
            <div className="shared-post-logo-icon" />
            <span className="shared-post-logo-text">WorTaF</span>
          </Link>
          <span className="shared-post-divider">/</span>
          <span className="shared-post-breadcrumb">TaxOverFlow</span>
          <div className="shared-post-header-actions">
            {user ? (
              <Button asChild variant="ghost" size="sm"><Link to="/community">Go to Community</Link></Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm"><Link to="/auth?mode=signin">Sign In</Link></Button>
                <Button asChild size="sm"><Link to="/auth?mode=signup">Sign Up Free</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="shared-post-main">
        {loading ? (
          <div className="shared-post-loading">Loading question...</div>
        ) : notFound || !post ? (
          <div className="shared-post-not-found">
            <h2>Question not found</h2>
            <p>This question may have been removed or is no longer available.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/taxoverflow"><ArrowLeft className="h-4 w-4 mr-1" /> Browse TaxOverFlow</Link>
            </Button>
          </div>
        ) : (
          <div className="shared-post-content">
            {/* Question Card */}
            <div className="shared-post-card">
              <div className="shared-post-meta">
                <Badge variant="outline" className="shared-post-country">{post.country}</Badge>
                {post.has_correct_answer && (
                  <Badge className="shared-post-solved">
                    <CheckCircle className="h-3 w-3 mr-1" /> Solved
                  </Badge>
                )}
                <span className="shared-post-time">{getTimeAgo(post.created_at)}</span>
              </div>

              <h1 className="shared-post-title">{post.title}</h1>
              <p className="shared-post-description">{post.description}</p>

              <div className="shared-post-footer">
                <div className="shared-post-stats">
                  <span className="shared-post-stat">
                    <ThumbsUp className="h-3.5 w-3.5" /> {post.vote_count} votes
                  </span>
                  <span className="shared-post-stat">
                    <MessageSquare className="h-3.5 w-3.5" /> {post.answer_count} answers
                  </span>
                </div>
                <div className="shared-post-tags">
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Answers — gated for guests */}
            <div className="shared-answers-section">
              <h2 className="shared-answers-heading">
                <MessageSquare className="h-4 w-4" /> {post.answer_count} {post.answer_count === 1 ? 'Answer' : 'Answers'}
              </h2>

              {!user ? (
                <div className="shared-answers-gate">
                  <div className="shared-answers-blur-row">
                    <div className="shared-answer-placeholder">
                      <div className="shared-answer-placeholder-line" style={{ width: '90%' }} />
                      <div className="shared-answer-placeholder-line" style={{ width: '75%' }} />
                      <div className="shared-answer-placeholder-line" style={{ width: '85%' }} />
                    </div>
                    {post.answer_count > 1 && (
                      <div className="shared-answer-placeholder">
                        <div className="shared-answer-placeholder-line" style={{ width: '80%' }} />
                        <div className="shared-answer-placeholder-line" style={{ width: '65%' }} />
                      </div>
                    )}
                  </div>
                  <div className="shared-answers-overlay">
                    <Lock className="h-8 w-8 text-primary" />
                    <h3>Sign up to see the answers</h3>
                    <p>Join TaxOverFlow to read expert answers, ask your own questions, and contribute to the community.</p>
                    <div className="shared-answers-overlay-actions">
                      <Button asChild size="lg"><Link to="/auth?mode=signup">Create Free Account</Link></Button>
                      <Button asChild variant="outline" size="lg"><Link to="/auth?mode=signin">Sign In</Link></Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="shared-answers-auth-cta">
                  <p>You're signed in! View this question and all answers in the full TaxOverFlow community.</p>
                  <Button asChild>
                    <Link to={`/community`}>Open in TaxOverFlow</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Bottom CTA for guests */}
            {!user && (
              <div className="shared-post-cta">
                <h3>Have a tax question?</h3>
                <p>Join thousands of people navigating cross-border taxes together.</p>
                <Button asChild size="lg"><Link to="/auth?mode=signup">Join TaxOverFlow Free</Link></Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
