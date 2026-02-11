import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, ThumbsUp, CheckCircle } from 'lucide-react';
import './PublicCommunity.css';

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
}

export default function PublicCommunity() {
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('community_posts')
        .select('id, country, title, description, tags, vote_count, answer_count, created_at')
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
    fetchPosts();
  }, []);

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
    <div className="public-community-container">
      <header className="public-community-header">
        <div className="public-community-header-content">
          <div className="public-community-header-left">
            <Link to="/" className="public-community-logo-link">
              <div className="public-community-logo-icon" />
              <span className="public-community-logo-text">WorTaF</span>
            </Link>
            <span className="public-community-divider">/</span>
            <h1 className="public-community-title">TaxOverFlow</h1>
          </div>
          <div className="public-community-header-right">
            <Button asChild variant="outline" size="sm">
              <Link to="/auth?mode=signin">Sign In to Participate</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth?mode=signup">Join Now</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="public-community-main">
        <div className="public-community-intro">
          <h2 className="public-community-intro-title">What taxpayers are discussing</h2>
          <p className="public-community-intro-text">
            Browse real tax questions from people managing cross-border finances. Sign up to ask questions, vote, and contribute answers.
          </p>
        </div>

        <div className="public-community-posts">
          {loading ? (
            <div className="public-community-empty">Loading questions...</div>
          ) : posts.length === 0 ? (
            <div className="public-community-empty">No questions posted yet. Be the first!</div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="public-post-card">
                <div className="public-post-votes">
                  <ThumbsUp className="public-post-vote-icon" />
                  <span className="public-post-vote-count">{post.vote_count}</span>
                </div>
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
                  <h3 className="public-post-title">{post.title}</h3>
                  <p className="public-post-excerpt">
                    {post.description.length > 180 ? post.description.substring(0, 180) + '…' : post.description}
                  </p>
                  <div className="public-post-footer">
                    <span className="public-post-stat">
                      <MessageSquare className="public-post-stat-icon" />
                      {post.answer_count} answers
                    </span>
                    {post.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="public-post-tag">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="public-community-cta">
          <p>Want to ask questions and contribute answers?</p>
          <Button asChild size="lg">
            <Link to="/auth?mode=signup">Join TaxOverFlow</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
