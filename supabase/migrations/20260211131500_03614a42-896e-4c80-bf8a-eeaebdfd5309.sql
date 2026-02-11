
-- Community Posts table
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  country TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  vote_count INTEGER NOT NULL DEFAULT 0,
  answer_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read active posts (country filtering done in app layer based on subscription)
CREATE POLICY "Authenticated users can view active posts"
ON public.community_posts FOR SELECT
USING (auth.uid() IS NOT NULL AND status = 'ACTIVE');

-- Admins can view all posts including deleted
CREATE POLICY "Admins can view all posts"
ON public.community_posts FOR SELECT
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own posts"
ON public.community_posts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
ON public.community_posts FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Admins can manage all posts (delete/update)
CREATE POLICY "Admins can manage all posts"
ON public.community_posts FOR ALL
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own posts"
ON public.community_posts FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Community Answers table
CREATE TABLE public.community_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active answers"
ON public.community_answers FOR SELECT
USING (auth.uid() IS NOT NULL AND status = 'ACTIVE');

CREATE POLICY "Admins can view all answers"
ON public.community_answers FOR SELECT
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own answers"
ON public.community_answers FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own answers"
ON public.community_answers FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can manage all answers"
ON public.community_answers FOR ALL
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own answers"
ON public.community_answers FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Community Votes table
CREATE TABLE public.community_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('POST', 'ANSWER')),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('UP', 'DOWN')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_id, entity_type)
);

ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view votes"
ON public.community_votes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own votes"
ON public.community_votes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
ON public.community_votes FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
ON public.community_votes FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- User Country Preferences table
CREATE TABLE public.user_country_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, country)
);

ALTER TABLE public.user_country_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own country preferences"
ON public.user_country_preferences FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can insert their own country preferences"
ON public.user_country_preferences FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own country preferences"
ON public.user_country_preferences FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own country preferences"
ON public.user_country_preferences FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all country preferences"
ON public.user_country_preferences FOR SELECT
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Post Reports table
CREATE TABLE public.community_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('POST', 'ANSWER')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reports"
ON public.community_reports FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can view their own reports"
ON public.community_reports FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can manage all reports"
ON public.community_reports FOR ALL
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on posts
CREATE TRIGGER update_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on answers
CREATE TRIGGER update_community_answers_updated_at
BEFORE UPDATE ON public.community_answers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_community_posts_country ON public.community_posts(country);
CREATE INDEX idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX idx_community_posts_status ON public.community_posts(status);
CREATE INDEX idx_community_answers_post_id ON public.community_answers(post_id);
CREATE INDEX idx_community_votes_entity ON public.community_votes(entity_id, entity_type);
CREATE INDEX idx_user_country_preferences_user ON public.user_country_preferences(user_id);
