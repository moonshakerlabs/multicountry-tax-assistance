import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, ThumbsUp, ThumbsDown, CheckCircle, Flag, Lock, Share2 } from 'lucide-react';
import ReportModal from '@/components/community/ReportModal';
import './PublicCommunity.css';
import { APP_NAME } from '@/lib/appConfig';

interface PublicPost {
  id: string;
  country: string;
  title: string;
  description: string;
  tags: string[];
  vote_count: number;
  answer_count: number;
  created_at: string;
  has_correct_answer?: boolean;
  user_id: string;
}

interface Answer {
  id: string;
  content: string;
  vote_count: number;
  is_correct: boolean;
  created_at: string;
  user_id: string;
}

export default function PublicCommunity() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSharePost = (postId: string) => {
    const shareUrl = `${window.location.origin}/taxoverflow/post/${postId}`;
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    toast({ title: 'Link copied!', description: 'Anyone can view the question with this link.' });
  };
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [userVotes, setUserVotes] = useState<Record<string, 'UP' | 'DOWN'>>({});
  const [reportTarget, setReportTarget] = useState<{ id: string; type: 'POST' | 'ANSWER' } | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
    if (user) fetchUserVotes();
  }, [user]);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('id, country, title, description, tags, vote_count, answer_count, created_at, user_id')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const postIds = data.map((p) => p.id);
      const { data: correctAnswers } = await supabase
        .from('community_answers')
        .select('post_id')
        .eq('is_correct', true)
        .in('post_id', postIds.length > 0 ? postIds : ['none']);
      const solvedSet = new Set(correctAnswers?.map((a) => a.post_id) || []);
      setPosts(data.map((p) => ({ ...p, tags: p.tags || [], has_correct_answer: solvedSet.has(p.id) })));
    }
    setLoading(false);
  };

  const fetchUserVotes = async () => {
    if (!user) return;
    const { data } = await supabase.from('community_votes').select('entity_id, vote_type').eq('user_id', user.id);
    if (data) {
      const votes: Record<string, 'UP' | 'DOWN'> = {};
      data.forEach((v) => { votes[v.entity_id] = v.vote_type as 'UP' | 'DOWN'; });
      setUserVotes(votes);
    }
  };

  const fetchAnswers = async (postId: string) => {
    const { data } = await supabase
      .from('community_answers')
      .select('id, content, vote_count, is_correct, created_at, user_id')
      .eq('post_id', postId)
      .eq('status', 'ACTIVE')
      .order('is_correct', { ascending: false })
      .order('vote_count', { ascending: false });
    if (data) setAnswers((prev) => ({ ...prev, [postId]: data }));
  };

  const toggleExpand = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!answers[postId]) fetchAnswers(postId);
    }
  };

  const handleVote = async (entityId: string, entityType: 'post' | 'answer', voteType: 'UP' | 'DOWN') => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to vote.', variant: 'destructive' });
      return;
    }
    const currentVote = userVotes[entityId];
    if (currentVote === voteType) {
      await supabase.from('community_votes').delete().eq('entity_id', entityId).eq('user_id', user.id);
      const increment = voteType === 'UP' ? -1 : 1;
      if (entityType === 'post') {
        await supabase.from('community_posts').update({ vote_count: posts.find(p => p.id === entityId)!.vote_count + increment }).eq('id', entityId);
      }
      setUserVotes((prev) => { const n = { ...prev }; delete n[entityId]; return n; });
    } else {
      let increment = voteType === 'UP' ? 1 : -1;
      if (currentVote) increment *= 2;
      if (currentVote) {
        await supabase.from('community_votes').update({ vote_type: voteType }).eq('entity_id', entityId).eq('user_id', user.id);
      } else {
        await supabase.from('community_votes').insert({ entity_id: entityId, entity_type: entityType, vote_type: voteType, user_id: user.id });
      }
      if (entityType === 'post') {
        await supabase.from('community_posts').update({ vote_count: posts.find(p => p.id === entityId)!.vote_count + increment }).eq('id', entityId);
      } else {
        const postId = Object.keys(answers).find(pid => answers[pid]?.some(a => a.id === entityId));
        if (postId) {
          const answer = answers[postId].find(a => a.id === entityId);
          if (answer) await supabase.from('community_answers').update({ vote_count: answer.vote_count + increment }).eq('id', entityId);
        }
      }
      setUserVotes((prev) => ({ ...prev, [entityId]: voteType }));
    }
    fetchPosts();
    if (expandedPost) fetchAnswers(expandedPost);
    fetchUserVotes();
  };

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

  // For guests: show first ~120 chars clearly, blur the rest
  const getDescriptionParts = (desc: string) => {
    const cutoff = 120;
    if (desc.length <= cutoff) return { visible: desc, blurred: '' };
    return { visible: desc.substring(0, cutoff), blurred: desc.substring(cutoff) };
  };

  return (
    <div className="public-community-container">
      <header className="public-community-header">
        <div className="public-community-header-content">
          <div className="public-community-header-left">
            <Link to="/" className="public-community-logo-link">
              <img src="/images/taxbebo-logo.png" alt={APP_NAME} className="public-community-logo-icon" />
              <span className="public-community-logo-text">{APP_NAME}</span>
            </Link>
            <span className="public-community-divider">/</span>
            <h1 className="public-community-title">TaxOverFlow</h1>
          </div>
          <div className="public-community-header-right">
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/dashboard">Dashboard</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link to="/profile">Profile</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link to="/pricing">Upgrade</Link></Button>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>Sign out</Button>
              </>
            ) : (
              <Button asChild variant="outline" size="sm"><Link to="/auth?mode=signin">Sign In</Link></Button>
            )}
          </div>
        </div>
      </header>

      <main className="public-community-main">
        <div className="public-community-intro">
          <h2 className="public-community-intro-title">What taxpayers are discussing</h2>
          <p className="public-community-intro-text">
            Browse real tax questions from people managing cross-border finances.
          </p>
        </div>

        <div className="public-community-posts">
          {loading ? (
            <div className="public-community-empty">Loading questions...</div>
          ) : posts.length === 0 ? (
            <div className="public-community-empty">No approved questions yet. Be the first to join!</div>
          ) : (
            posts.map((post) => {
              const { visible, blurred } = getDescriptionParts(post.description);
              const isExpanded = expandedPost === post.id;
              const showGuestBlur = !user;

              return (
                <div key={post.id} className="public-post-card">
                  {/* Vote column */}
                  <div className="public-post-votes">
                    <button
                      className={`public-vote-btn ${userVotes[post.id] === 'UP' ? 'public-vote-active-up' : ''}`}
                      onClick={() => handleVote(post.id, 'post', 'UP')}
                      title="Upvote"
                    >
                      <ThumbsUp className="public-post-vote-icon" />
                    </button>
                    <span className="public-post-vote-count">{post.vote_count}</span>
                    <button
                      className={`public-vote-btn ${userVotes[post.id] === 'DOWN' ? 'public-vote-active-down' : ''}`}
                      onClick={() => handleVote(post.id, 'post', 'DOWN')}
                      title="Downvote"
                    >
                      <ThumbsDown className="public-post-vote-icon" />
                    </button>
                  </div>

                  {/* Post body */}
                  <div className="public-post-body">
                    <div className="public-post-meta">
                      <Badge variant="outline" className="public-post-country">{post.country}</Badge>
                      {post.has_correct_answer && (
                        <Badge className="public-post-solved">
                          <CheckCircle className="public-post-solved-icon" />
                          Solved
                        </Badge>
                      )}
                      <span className="public-post-time">{getTimeAgo(post.created_at)}</span>
                    </div>

                    {/* Bold highlighted title */}
                    <h3 className="public-post-title public-post-title-clickable" onClick={() => toggleExpand(post.id)}>
                      {post.title}
                    </h3>

                    {/* Description: partial blur for guests */}
                    <div className="public-post-description-wrapper">
                      <span className="public-post-description-visible">{visible}</span>
                      {blurred && showGuestBlur ? (
                        <span className="public-post-description-blurred">{blurred}</span>
                      ) : blurred ? (
                        <span>{blurred}</span>
                      ) : null}
                    </div>

                    {/* Guest CTA inline if description is blurred */}
                    {showGuestBlur && blurred && (
                      <div className="public-post-guest-cta">
                        <Lock className="public-post-guest-cta-icon" />
                        <span>Sign in to view the full post and answers or answer this question</span>
                        <Button asChild size="sm" variant="outline" className="public-post-guest-cta-btn">
                          <Link to="/auth?mode=signin">Sign In</Link>
                        </Button>
                      </div>
                    )}

                    <div className="public-post-footer">
                      <span className="public-post-stat" onClick={() => user ? toggleExpand(post.id) : null} style={{ cursor: user ? 'pointer' : 'default' }}>
                        <MessageSquare className="public-post-stat-icon" />
                        {post.answer_count} answers
                      </span>
                      <button className="public-report-btn" onClick={() => handleSharePost(post.id)} title="Copy share link">
                        <Share2 className="public-report-icon" />
                      </button>
                      {user && (
                        <button className="public-report-btn" onClick={() => setReportTarget({ id: post.id, type: 'POST' })}>
                          <Flag className="public-report-icon" />
                        </button>
                      )}
                      {post.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="public-post-tag">{tag}</Badge>
                      ))}
                    </div>

                    {/* Expanded answers — only for signed-in users */}
                    {isExpanded && user && (
                      <div className="public-answers-section">
                        <h4 className="public-answers-heading">{post.answer_count} Answers</h4>
                        <div className="public-answers-list">
                          {answers[post.id] === undefined && <p className="public-community-empty">Loading answers...</p>}
                          {answers[post.id]?.length === 0 && <p className="public-community-empty">No answers yet. Be the first!</p>}
                          {answers[post.id]?.map((answer) => (
                            <div key={answer.id} className={`public-answer-card ${answer.is_correct ? 'public-answer-correct' : ''}`}>
                              {answer.is_correct && (
                                <Badge className="public-answer-correct-badge">
                                  <CheckCircle className="public-post-solved-icon" />
                                  Correct Answer
                                </Badge>
                              )}
                              <p className="public-answer-content">{answer.content}</p>
                              <div className="public-answer-footer">
                                <div className="public-answer-votes">
                                  <button className={`public-vote-btn-sm ${userVotes[answer.id] === 'UP' ? 'public-vote-active-up' : ''}`} onClick={() => handleVote(answer.id, 'answer', 'UP')}>
                                    <ThumbsUp className="public-vote-icon-sm" />
                                  </button>
                                  <span>{answer.vote_count}</span>
                                  <button className={`public-vote-btn-sm ${userVotes[answer.id] === 'DOWN' ? 'public-vote-active-down' : ''}`} onClick={() => handleVote(answer.id, 'answer', 'DOWN')}>
                                    <ThumbsDown className="public-vote-icon-sm" />
                                  </button>
                                </div>
                                <span className="public-answer-time">{getTimeAgo(answer.created_at)}</span>
                                <button className="public-report-btn" onClick={() => setReportTarget({ id: answer.id, type: 'ANSWER' })}>
                                  <Flag className="public-report-icon" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* If guest clicks on answers stat, show blur CTA */}
                    {isExpanded && !user && (
                      <div className="public-answers-section">
                        <h4 className="public-answers-heading">{post.answer_count} Answers</h4>
                        <div className="public-answers-blur-wrapper">
                          <div className="public-answers-blurred">
                            <div className="public-answer-placeholder"><p>This answer discusses the tax implications of cross-border income and provides detailed guidance on compliance requirements for multi-country filing...</p></div>
                            <div className="public-answer-placeholder"><p>Another expert answer covering specific regulations and filing requirements for international taxation scenarios and double tax treaties...</p></div>
                          </div>
                          <div className="public-answers-login-overlay">
                            <Lock className="public-answers-lock-icon" />
                            <p>Sign in to view answers or answer this question</p>
                            <div className="public-answers-overlay-actions">
                              <Button asChild size="sm" variant="outline"><Link to="/auth?mode=signin">Sign In</Link></Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!user && (
          <div className="public-community-cta">
            <h3 className="public-community-cta-title">Ready to join the conversation?</h3>
            <p>Ask tax questions, share expertise, and get answers from the community.</p>
            <div className="public-community-cta-actions">
              <Button asChild size="lg"><Link to="/auth?mode=signin">Sign In to Participate</Link></Button>
            </div>
          </div>
        )}
      </main>

      {reportTarget && user && (
        <ReportModal
          isOpen={true}
          entityType={reportTarget.type}
          onClose={() => setReportTarget(null)}
          onSubmit={async (reason) => {
            setReportSubmitting(true);
            await supabase.from('community_reports').insert({ entity_id: reportTarget.id, entity_type: reportTarget.type, reason, user_id: user.id });
            setReportSubmitting(false);
            setReportTarget(null);
            toast({ title: 'Report submitted', description: 'Thank you for helping keep the community safe.' });
          }}
          submitting={reportSubmitting}
        />
      )}
    </div>
  );
}
