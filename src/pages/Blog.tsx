import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Clock, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { APP_NAME, APP_CONFIG } from '@/lib/appConfig';
import { format } from 'date-fns';
import './Blog.css';

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  is_trending: boolean;
  published_at: string | null;
  created_at: string;
};

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await (supabase as any)
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, is_trending, published_at, created_at')
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false });
      setPosts((data as BlogPost[]) || []);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const trendingPosts = posts.filter(p => p.is_trending);
  const allPosts = posts;

  const handleShare = async (post: BlogPost) => {
    const url = `${APP_CONFIG.appUrl}/blog/${post.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="blog-container">
      <header className="blog-header">
        <div className="blog-header-content">
          <Link to="/" className="blog-back-link">
            <ArrowLeft className="blog-back-icon" />
            Back to Home
          </Link>
          <div className="blog-logo">
            <div className="blog-logo-icon" />
            <span className="blog-logo-text">{APP_NAME}</span>
          </div>
        </div>
      </header>

      <main className="blog-main">
        {loading ? (
          <p className="blog-coming-text">Loading...</p>
        ) : posts.length === 0 ? (
          <>
            <h1 className="blog-coming-title">Blog</h1>
            <p className="blog-coming-text">Coming Soon</p>
            <p className="blog-coming-description">
              We're working on insightful articles about cross-border taxation, compliance tips, and financial planning for global taxpayers.
            </p>
            <Button asChild variant="outline" size="lg">
              <Link to="/">Back to Home</Link>
            </Button>
          </>
        ) : (
          <div className="blog-content-wrapper">
            <h1 className="blog-page-title">Blog</h1>

            {/* Trending Section */}
            {trendingPosts.length > 0 && (
              <section className="blog-trending-section">
                <h2 className="blog-section-title">
                  <TrendingUp className="h-5 w-5" /> Trending
                </h2>
                <div className="blog-grid">
                  {trendingPosts.map(post => (
                    <BlogCard key={post.id} post={post} onShare={handleShare} />
                  ))}
                </div>
              </section>
            )}

            {/* All Posts */}
            <section className="blog-all-section">
              <h2 className="blog-section-title">All Posts</h2>
              <div className="blog-grid">
                {allPosts.map(post => (
                  <BlogCard key={post.id} post={post} onShare={handleShare} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function BlogCard({ post, onShare }: { post: BlogPost; onShare: (p: BlogPost) => void }) {
  return (
    <div className="blog-card">
      {post.cover_image_url && (
        <img src={post.cover_image_url} alt={post.title} className="blog-card-image" />
      )}
      <div className="blog-card-body">
        <div className="blog-card-meta">
          {post.is_trending && (
            <span className="blog-card-trending">
              <TrendingUp className="h-3 w-3" /> Trending
            </span>
          )}
          <span className="blog-card-date">
            <Clock className="h-3 w-3" />
            {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : ''}
          </span>
        </div>
        <Link to={`/blog/${post.slug}`} className="blog-card-title-link">
          <h3 className="blog-card-title">{post.title}</h3>
        </Link>
        {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
        <div className="blog-card-actions">
          <Link to={`/blog/${post.slug}`}>
            <Button variant="outline" size="sm">Read More</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => onShare(post)}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
