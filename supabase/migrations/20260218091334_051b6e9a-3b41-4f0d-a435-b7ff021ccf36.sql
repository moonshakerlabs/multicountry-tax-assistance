
-- Allow public (unauthenticated) users to read ACTIVE community posts
CREATE POLICY "Public can view active posts"
  ON public.community_posts
  FOR SELECT
  USING (status = 'ACTIVE');
