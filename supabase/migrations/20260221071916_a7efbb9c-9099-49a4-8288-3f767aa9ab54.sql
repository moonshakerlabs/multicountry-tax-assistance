
-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  is_trending BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blog comments table
CREATE TABLE public.blog_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX idx_blog_comments_post ON public.blog_comments(post_id);
CREATE INDEX idx_blog_comments_status ON public.blog_comments(status);

-- Updated_at triggers
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_comments_updated_at
  BEFORE UPDATE ON public.blog_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

-- blog_posts RLS policies
CREATE POLICY "Public can view published posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'PUBLISHED');

CREATE POLICY "Admins can manage all posts"
  ON public.blog_posts FOR ALL
  USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

CREATE POLICY "Admins can view all posts"
  ON public.blog_posts FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

-- blog_comments RLS policies
CREATE POLICY "Public can view approved comments on published posts"
  ON public.blog_comments FOR SELECT
  USING (
    status = 'APPROVED' AND EXISTS (
      SELECT 1 FROM public.blog_posts bp
      WHERE bp.id = blog_comments.post_id AND bp.status = 'PUBLISHED'
    )
  );

CREATE POLICY "Admins can manage all comments"
  ON public.blog_comments FOR ALL
  USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

CREATE POLICY "Admins can view all comments"
  ON public.blog_comments FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_any_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert comments"
  ON public.blog_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can view their own comments"
  ON public.blog_comments FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Post authors can view on-hold comments"
  ON public.blog_comments FOR SELECT
  USING (
    status = 'ON_HOLD' AND EXISTS (
      SELECT 1 FROM public.blog_posts bp
      WHERE bp.id = blog_comments.post_id AND bp.author_id = auth.uid()
    )
  );
