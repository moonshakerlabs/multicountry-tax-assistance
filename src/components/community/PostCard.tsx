import { ThumbsUp, ThumbsDown, MessageSquare, CheckCircle, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import './PostCard.css';

export interface PostData {
  id: string;
  user_id: string;
  country: string;
  title: string;
  description: string;
  tags: string[];
  vote_count: number;
  answer_count: number;
  status: string;
  created_at: string;
  author_email?: string;
  user_vote?: 'UP' | 'DOWN' | null;
  has_correct_answer?: boolean;
}

interface PostCardProps {
  post: PostData;
  onClick: (id: string) => void;
  onVote: (postId: string, voteType: 'UP' | 'DOWN') => void;
  onReport: (entityId: string, entityType: 'POST' | 'ANSWER') => void;
  currentUserId?: string;
}

export default function PostCard({ post, onClick, onVote, onReport, currentUserId }: PostCardProps) {
  const timeAgo = getTimeAgo(post.created_at);

  return (
    <div className="post-card" onClick={() => onClick(post.id)}>
      <div className="post-card-votes">
        <Button
          variant="ghost"
          size="sm"
          className={`post-vote-btn ${post.user_vote === 'UP' ? 'post-vote-active-up' : ''}`}
          onClick={(e) => { e.stopPropagation(); onVote(post.id, 'UP'); }}
          disabled={post.user_id === currentUserId}
        >
          <ThumbsUp className="post-vote-icon" />
        </Button>
        <span className={`post-vote-count ${post.vote_count > 0 ? 'post-vote-positive' : post.vote_count < 0 ? 'post-vote-negative' : ''}`}>
          {post.vote_count}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className={`post-vote-btn ${post.user_vote === 'DOWN' ? 'post-vote-active-down' : ''}`}
          onClick={(e) => { e.stopPropagation(); onVote(post.id, 'DOWN'); }}
          disabled={post.user_id === currentUserId}
        >
          <ThumbsDown className="post-vote-icon" />
        </Button>
      </div>
      <div className="post-card-body">
        <div className="post-card-meta">
          <Badge variant="outline" className="post-country-badge">{post.country}</Badge>
          {post.has_correct_answer && (
            <Badge className="post-solved-badge">
              <CheckCircle className="post-solved-icon" />
              Solved
            </Badge>
          )}
          <span className="post-time">{timeAgo}</span>
        </div>
        <h3 className="post-card-title">{post.title}</h3>
        <p className="post-card-excerpt">
          {post.description.length > 160 ? post.description.substring(0, 160) + '…' : post.description}
        </p>
        <div className="post-card-footer">
          <div className="post-card-stats">
            <span className="post-stat">
              <MessageSquare className="post-stat-icon" />
              {post.answer_count} answers
            </span>
            {post.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="post-tag">{tag}</Badge>
            ))}
          </div>
          <div className="post-card-actions">
            <span className="post-author">by {post.author_email || 'Anonymous'}</span>
            <Button
              variant="ghost"
              size="sm"
              className="post-report-btn"
              onClick={(e) => { e.stopPropagation(); onReport(post.id, 'POST'); }}
            >
              <Flag className="post-report-icon" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
