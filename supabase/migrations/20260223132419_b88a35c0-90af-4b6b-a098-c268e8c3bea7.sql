
-- Fix blog_posts RLS: change from restrictive to permissive
DROP POLICY IF EXISTS "Public can view published posts" ON public.blog_posts;
CREATE POLICY "Public can view published posts" ON public.blog_posts
  FOR SELECT USING (status = 'PUBLISHED');

DROP POLICY IF EXISTS "Admins can view all posts" ON public.blog_posts;
CREATE POLICY "Admins can view all posts" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;
CREATE POLICY "Admins can manage all posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (is_any_admin(auth.uid()));

-- Fix blog_comments RLS similarly
DROP POLICY IF EXISTS "Public can view approved comments on published posts" ON public.blog_comments;
CREATE POLICY "Public can view approved comments on published posts" ON public.blog_comments
  FOR SELECT USING (
    status = 'APPROVED' AND EXISTS (
      SELECT 1 FROM blog_posts bp WHERE bp.id = blog_comments.post_id AND bp.status = 'PUBLISHED'
    )
  );

DROP POLICY IF EXISTS "Admins can view all comments" ON public.blog_comments;
CREATE POLICY "Admins can view all comments" ON public.blog_comments
  FOR SELECT TO authenticated
  USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all comments" ON public.blog_comments;
CREATE POLICY "Admins can manage all comments" ON public.blog_comments
  FOR ALL TO authenticated
  USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own comments" ON public.blog_comments;
CREATE POLICY "Users can view their own comments" ON public.blog_comments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.blog_comments;
CREATE POLICY "Authenticated users can insert comments" ON public.blog_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Post authors can view on-hold comments" ON public.blog_comments;
CREATE POLICY "Post authors can view on-hold comments" ON public.blog_comments
  FOR SELECT USING (
    status = 'ON_HOLD' AND EXISTS (
      SELECT 1 FROM blog_posts bp WHERE bp.id = blog_comments.post_id AND bp.author_id = auth.uid()
    )
  );
