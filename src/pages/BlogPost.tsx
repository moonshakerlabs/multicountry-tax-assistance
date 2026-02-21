import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Share2, Clock, TrendingUp, Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { APP_NAME, APP_CONFIG } from '@/lib/appConfig';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import './BlogPost.css';

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  is_trending: boolean;
  published_at: string | null;
  author_id: string;
};

type Comment = {
  id: string;
  content: string;
  status: string;
  created_at: string;
  user_id: string;
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      const { data } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'PUBLISHED')
        .single();
      setPost(data as Post | null);
      if (data) fetchComments((data as any).id);
      setLoading(false);
    };
    if (slug) fetchPost();
  }, [slug]);

  const fetchComments = async (postId: string) => {
    const { data } = await (supabase as any)
      .from('blog_comments')
      .select('*')
      .eq('post_id', postId)
      .eq('status', 'APPROVED')
      .order('created_at', { ascending: true });
    setComments((data as Comment[]) || []);
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({ title: 'Please sign in to comment', variant: 'destructive' });
      return;
    }
    if (!newComment.trim() || !post) return;
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from('blog_comments')
      .insert({ post_id: post.id, user_id: user.id, content: newComment.trim() });
    if (error) {
      toast({ title: 'Error posting comment', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Comment submitted for review' });
      setNewComment('');
    }
    setSubmitting(false);
  };

  const handleShare = () => {
    const url = `${APP_CONFIG.appUrl}/blog/${post?.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link copied to clipboard!' });
    });
  };

  if (loading) return <div className="blogpost-loading">Loading...</div>;
  if (!post) return (
    <div className="blogpost-not-found">
      <h1>Post not found</h1>
      <Button asChild variant="outline"><Link to="/blog">Back to Blog</Link></Button>
    </div>
  );

  return (
    <div className="blogpost-container">
      <header className="blogpost-header">
        <div className="blogpost-header-content">
          <Link to="/blog" className="blogpost-back-link">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
          <div className="blogpost-logo">
            <div className="blogpost-logo-icon" />
            <span className="blogpost-logo-text">{APP_NAME}</span>
          </div>
        </div>
      </header>

      <article className="blogpost-article">
        {post.cover_image_url && (
          <img src={post.cover_image_url} alt={post.title} className="blogpost-cover" />
        )}

        <div className="blogpost-meta">
          {post.is_trending && (
            <span className="blogpost-trending">
              <TrendingUp className="h-3.5 w-3.5" /> Trending
            </span>
          )}
          <span className="blogpost-date">
            <Clock className="h-3.5 w-3.5" />
            {post.published_at ? format(new Date(post.published_at), 'MMMM d, yyyy') : ''}
          </span>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
        </div>

        <h1 className="blogpost-title">{post.title}</h1>

        <div className="blogpost-content prose">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </article>

      {/* Comments Section */}
      <section className="blogpost-comments">
        <h2 className="blogpost-comments-title">
          <MessageSquare className="h-5 w-5" /> Comments ({comments.length})
        </h2>

        {comments.map(c => (
          <div key={c.id} className="blogpost-comment">
            <p className="blogpost-comment-content">{c.content}</p>
            <span className="blogpost-comment-date">
              {format(new Date(c.created_at), 'MMM d, yyyy')}
            </span>
          </div>
        ))}

        {user ? (
          <div className="blogpost-comment-form">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              rows={3}
            />
            <Button onClick={handleSubmitComment} disabled={submitting || !newComment.trim()}>
              <Send className="h-4 w-4 mr-1" /> {submitting ? 'Submitting...' : 'Submit Comment'}
            </Button>
          </div>
        ) : (
          <div className="blogpost-comment-signin">
            <p>Sign in to leave a comment.</p>
            <Button asChild variant="outline">
              <Link to="/auth?mode=signup">Sign Up / Sign In</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
