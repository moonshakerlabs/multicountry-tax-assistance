import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useCommunityCountries } from '@/hooks/useCommunityCountries';
import { toast } from '@/hooks/use-toast';
import CommunityHeader from '@/components/community/CommunityHeader';
import CountrySelector from '@/components/community/CountrySelector';
import PostCard, { PostData } from '@/components/community/PostCard';
import PostDetail from '@/components/community/PostDetail';
import AskQuestionModal from '@/components/community/AskQuestionModal';
import ReportModal from '@/components/community/ReportModal';
import { Badge } from '@/components/ui/badge';
import './Community.css';

export default function Community() {
  const { user } = useAuth();
  const { subscription, getPostingLimit } = useSubscription();
  const { selectedCountries, setCountries, countryLimit } = useCommunityCountries();

  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showAskModal, setShowAskModal] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postCount, setPostCount] = useState(0);
  const [filterCountry, setFilterCountry] = useState<string>('all');

  // Report state
  const [reportTarget, setReportTarget] = useState<{ entityId: string; entityType: 'POST' | 'ANSWER' } | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (selectedCountries.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('community_posts')
      .select('*')
      .eq('status', 'ACTIVE')
      .in('country', selectedCountries)
      .order('created_at', { ascending: false });

    if (filterCountry !== 'all') {
      query = query.eq('country', filterCountry);
    }

    const { data } = await query;

    if (data && user) {
      // Fetch user votes on posts
      const postIds = data.map((p) => p.id);
      const { data: votes } = await supabase
        .from('community_votes')
        .select('entity_id, vote_type')
        .eq('user_id', user.id)
        .eq('entity_type', 'POST')
        .in('entity_id', postIds.length > 0 ? postIds : ['none']);

      const voteMap = new Map(votes?.map((v) => [v.entity_id, v.vote_type]) || []);

      // Fetch author emails
      const userIds = [...new Set(data.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds.length > 0 ? userIds : ['none']);
      const emailMap = new Map(profiles?.map((p) => [p.id, p.email]) || []);

      // Check for correct answers
      const { data: correctAnswers } = await supabase
        .from('community_answers')
        .select('post_id')
        .eq('is_correct', true)
        .in('post_id', postIds.length > 0 ? postIds : ['none']);
      const solvedSet = new Set(correctAnswers?.map((a) => a.post_id) || []);

      setPosts(
        data.map((p) => ({
          ...p,
          tags: p.tags || [],
          author_email: emailMap.get(p.user_id),
          user_vote: (voteMap.get(p.id) as 'UP' | 'DOWN') || null,
          has_correct_answer: solvedSet.has(p.id),
        }))
      );
    } else {
      setPosts(data?.map((p) => ({ ...p, tags: p.tags || [] })) || []);
    }
    setLoading(false);
  }, [selectedCountries, filterCountry, user]);

  // Fetch posting count for limits
  const fetchPostCount = useCallback(async () => {
    if (!user) return;
    const limit = getPostingLimit();
    if (!limit) { setPostCount(0); return; }

    const since = new Date();
    if (limit.period === 'week') {
      since.setDate(since.getDate() - 7);
    } else {
      since.setDate(since.getDate() - 30);
    }

    const { count } = await supabase
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since.toISOString());

    setPostCount(count || 0);
  }, [user, getPostingLimit]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => { fetchPostCount(); }, [fetchPostCount]);

  const canPost = (() => {
    if (selectedCountries.length === 0) return false;
    const limit = getPostingLimit();
    if (!limit) return true;
    return postCount < limit.count;
  })();

  const handleAskQuestion = async (data: { title: string; description: string; country: string; tags: string[] }) => {
    if (!user) return;
    setSubmittingPost(true);

    if (!selectedCountries.includes(data.country)) {
      toast({ title: 'Country not allowed', description: 'You can only post in your selected countries.', variant: 'destructive' });
      setSubmittingPost(false);
      return;
    }

    const { error } = await supabase.from('community_posts').insert({
      user_id: user.id,
      country: data.country,
      title: data.title,
      description: data.description,
      tags: data.tags,
      status: 'PENDING',
    });

    if (!error) {
      setShowAskModal(false);
      fetchPosts();
      fetchPostCount();
      toast({ title: 'Question submitted!', description: 'Your question is pending review and will appear in TaxOverflow once approved.' });
    } else {
      toast({ title: 'Error posting question', description: error.message, variant: 'destructive' });
    }
    setSubmittingPost(false);
  };

  const handleVotePost = async (postId: string, voteType: 'UP' | 'DOWN') => {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    if (!post || post.user_id === user.id) return;

    const existing = post.user_vote;
    if (existing === voteType) {
      await supabase.from('community_votes').delete()
        .eq('user_id', user.id).eq('entity_id', postId).eq('entity_type', 'POST');
      const delta = voteType === 'UP' ? -1 : 1;
      await supabase.from('community_posts').update({ vote_count: post.vote_count + delta }).eq('id', postId);
    } else if (existing) {
      await supabase.from('community_votes').update({ vote_type: voteType })
        .eq('user_id', user.id).eq('entity_id', postId).eq('entity_type', 'POST');
      const delta = voteType === 'UP' ? 2 : -2;
      await supabase.from('community_posts').update({ vote_count: post.vote_count + delta }).eq('id', postId);
    } else {
      await supabase.from('community_votes').insert({
        user_id: user.id, entity_id: postId, entity_type: 'POST', vote_type: voteType,
      });
      const delta = voteType === 'UP' ? 1 : -1;
      await supabase.from('community_posts').update({ vote_count: post.vote_count + delta }).eq('id', postId);
    }
    fetchPosts();
  };

  const handleReport = (entityId: string, entityType: 'POST' | 'ANSWER') => {
    setReportTarget({ entityId, entityType });
  };

  const handleSubmitReport = async (reason: string) => {
    if (!user || !reportTarget) return;
    setSubmittingReport(true);
    const { error } = await supabase.from('community_reports').insert({
      user_id: user.id,
      entity_id: reportTarget.entityId,
      entity_type: reportTarget.entityType,
      reason,
    });
    if (!error) {
      toast({ title: 'Report submitted', description: 'Our team will review this content.' });
      setReportTarget(null);
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setSubmittingReport(false);
  };

  const postingLimit = getPostingLimit();

  if (selectedPostId) {
    return (
      <div className="community-container">
        <CommunityHeader onAskQuestion={() => setShowAskModal(true)} canPost={canPost} />
        <PostDetail
          postId={selectedPostId}
          onBack={() => { setSelectedPostId(null); fetchPosts(); }}
          onVotePost={handleVotePost}
          onReport={handleReport}
        />
        <ReportModal
          isOpen={!!reportTarget}
          entityType={reportTarget?.entityType || 'POST'}
          onClose={() => setReportTarget(null)}
          onSubmit={handleSubmitReport}
          submitting={submittingReport}
        />
      </div>
    );
  }

  return (
    <div className="community-container">
      <CommunityHeader onAskQuestion={() => setShowAskModal(true)} canPost={canPost} />

      <main className="community-main">
        <div className="community-content">
          {/* Country Selector */}
          <CountrySelector
            selectedCountries={selectedCountries}
            countryLimit={countryLimit}
            onSave={setCountries}
          />

          {/* Posting Limits Info */}
          {postingLimit && (
            <div className="community-limit-info">
              <span className="community-limit-text">
                Posts: {postCount}/{postingLimit.count} per {postingLimit.period}
              </span>
              <Badge variant="outline" className="community-plan-badge">
                {subscription.subscription_plan} Plan
              </Badge>
            </div>
          )}

          {/* Country Filter Tabs */}
          {selectedCountries.length > 0 && (
            <div className="community-filter-tabs">
              <button
                className={`community-filter-tab ${filterCountry === 'all' ? 'community-filter-tab-active' : ''}`}
                onClick={() => setFilterCountry('all')}
              >
                All
              </button>
              {selectedCountries.map((c) => (
                <button
                  key={c}
                  className={`community-filter-tab ${filterCountry === c ? 'community-filter-tab-active' : ''}`}
                  onClick={() => setFilterCountry(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Posts List */}
          <div className="community-posts-list">
            {loading ? (
              <div className="community-empty">Loading questions...</div>
            ) : selectedCountries.length === 0 ? (
              <div className="community-empty">
                <p className="community-empty-title">Select your tax countries</p>
                <p className="community-empty-text">
                  Choose the countries you're interested in to see and post tax questions.
                </p>
              </div>
            ) : posts.length === 0 ? (
              <div className="community-empty">
                <p className="community-empty-title">No questions yet</p>
                <p className="community-empty-text">
                  Be the first to ask a tax question for your selected countries!
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={setSelectedPostId}
                  onVote={handleVotePost}
                  onReport={handleReport}
                  currentUserId={user?.id}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <AskQuestionModal
        isOpen={showAskModal}
        onClose={() => setShowAskModal(false)}
        onSubmit={handleAskQuestion}
        allowedCountries={selectedCountries}
        submitting={submittingPost}
      />

      <ReportModal
        isOpen={!!reportTarget}
        entityType={reportTarget?.entityType || 'POST'}
        onClose={() => setReportTarget(null)}
        onSubmit={handleSubmitReport}
        submitting={submittingReport}
      />
    </div>
  );
}
