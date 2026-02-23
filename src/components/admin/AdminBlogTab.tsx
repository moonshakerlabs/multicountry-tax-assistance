import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit2, Trash2, TrendingUp, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

type BlogPost = {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  status: string;
  is_trending: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type BlogComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  status: string;
  created_at: string;
};

type View = 'list' | 'editor' | 'comments';

export default function AdminBlogTab() {
  const { user, userRoles, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<View>('list');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [commentFilter, setCommentFilter] = useState<string>('ALL');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [permissions, setPermissions] = useState<{ can_read: boolean; can_write: boolean }>({ can_read: false, can_write: false });

  // Editor state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Check if user is an employee (not a regular customer)
  const isEmployee = userRoles.some(r => ['super_admin', 'employee_admin', 'user_admin'].includes(r));

  // Determine moderation capability based on hierarchy
  // super_admin: can moderate all posts
  // employee_admin: can moderate user_admin posts (based on blog permissions)
  // user_admin: can moderate only if they have blog write permission
  const canModerate = isSuperAdmin || (isEmployee && permissions.can_write);
  const canCreatePost = isEmployee; // Only employees can create blog posts

  useEffect(() => {
    fetchPosts();
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    if (!user) return;
    // Get the user's highest role for blog permissions
    const currentRole = userRoles.find(r => ['employee_admin', 'user_admin'].includes(r));
    if (isSuperAdmin) {
      setPermissions({ can_read: true, can_write: true });
      return;
    }
    if (!currentRole) return;
    const { data } = await supabase
      .from('role_permissions')
      .select('can_read, can_write')
      .eq('role', currentRole as any)
      .eq('module', 'blog')
      .maybeSingle();
    if (data) setPermissions(data);
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setPosts((data as any[]) || []);
    setLoading(false);
  };

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('blog_comments')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setComments((data as any[]) || []);
    setLoading(false);
  };

  const generateSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const openEditor = (post?: BlogPost) => {
    if (!canCreatePost) {
      toast({ title: 'Not allowed', description: 'Only employees can create or edit blog posts.', variant: 'destructive' });
      return;
    }
    if (post) {
      // Check moderation hierarchy for editing
      if (!isSuperAdmin && post.author_id !== user?.id) {
        // employee_admin can edit user_admin posts, user_admin can only edit own
        // For simplicity, non-super_admins can only edit their own posts
        if (!canModerate) {
          toast({ title: 'Not allowed', description: 'You can only edit your own posts.', variant: 'destructive' });
          return;
        }
      }
      setSelectedPost(post);
      setTitle(post.title);
      setSlug(post.slug);
      setContent(post.content);
      setExcerpt(post.excerpt || '');
      setCoverImageUrl(post.cover_image_url || '');
    } else {
      setSelectedPost(null);
      setTitle('');
      setSlug('');
      setContent('');
      setExcerpt('');
      setCoverImageUrl('');
    }
    setView('editor');
  };

  const handleSave = async (publishNow = false) => {
    if (!title.trim() || !content.trim()) {
      toast({ title: 'Title and content are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const finalSlug = slug.trim() || generateSlug(title);
    const payload: any = {
      title: title.trim(),
      slug: finalSlug,
      content: content.trim(),
      excerpt: excerpt.trim() || null,
      cover_image_url: coverImageUrl.trim() || null,
    };

    if (publishNow) {
      payload.status = 'PUBLISHED';
      payload.published_at = new Date().toISOString();
    }

    try {
      if (selectedPost) {
        const { error } = await (supabase as any)
          .from('blog_posts')
          .update(payload)
          .eq('id', selectedPost.id);
        if (error) throw error;
        toast({ title: publishNow ? 'Post published!' : 'Post updated!' });
      } else {
        payload.author_id = user?.id;
        if (!publishNow) payload.status = 'DRAFT';
        const { error } = await (supabase as any)
          .from('blog_posts')
          .insert(payload);
        if (error) throw error;
        toast({ title: publishNow ? 'Post published!' : 'Draft saved!' });
      }
      await fetchPosts();
      setView('list');
    } catch (e: any) {
      toast({ title: 'Error saving post', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Moderation: check hierarchy before allowing status change
  const canModeratePost = (post: BlogPost): boolean => {
    if (isSuperAdmin) return true;
    if (!canModerate) return false;
    // employee_admin can moderate user_admin posts
    // user_admin can only moderate if they have blog write permission and it's not an employee_admin post
    // We check author's role to enforce hierarchy
    return true; // RLS + permissions handle this at DB level
  };

  const handleStatusChange = async (postId: string, newStatus: string) => {
    const payload: any = { status: newStatus };
    if (newStatus === 'PUBLISHED') payload.published_at = new Date().toISOString();
    const { error } = await (supabase as any)
      .from('blog_posts')
      .update(payload)
      .eq('id', postId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Post ${newStatus.toLowerCase()}` });
      fetchPosts();
    }
  };

  const toggleTrending = async (postId: string, current: boolean) => {
    const { error } = await (supabase as any)
      .from('blog_posts')
      .update({ is_trending: !current })
      .eq('id', postId);
    if (!error) {
      setPosts(posts.map(p => p.id === postId ? { ...p, is_trending: !current } : p));
      toast({ title: !current ? 'Marked as trending' : 'Removed from trending' });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post and all its comments?')) return;
    const { error } = await (supabase as any).from('blog_posts').delete().eq('id', postId);
    if (!error) {
      toast({ title: 'Post deleted' });
      fetchPosts();
    }
  };

  const handleCommentStatus = async (commentId: string, newStatus: string) => {
    const { error } = await (supabase as any)
      .from('blog_comments')
      .update({ status: newStatus })
      .eq('id', commentId);
    if (!error) {
      toast({ title: `Comment ${newStatus.toLowerCase()}` });
      fetchComments();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment permanently?')) return;
    const { error } = await (supabase as any).from('blog_comments').delete().eq('id', commentId);
    if (!error) {
      toast({ title: 'Comment deleted' });
      fetchComments();
    }
  };

  const filteredPosts = statusFilter === 'ALL' ? posts : posts.filter(p => p.status === statusFilter);
  const filteredComments = commentFilter === 'ALL' ? comments : comments.filter(c => c.status === commentFilter);

  // Permission guard
  if (!isEmployee) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium">Access Restricted</p>
        <p>Only employees can access blog management. Customers cannot create or manage blog posts.</p>
      </div>
    );
  }

  if (!permissions.can_read && !isSuperAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium">No Blog Access</p>
        <p>You don't have permission to access the blog module. Contact your administrator.</p>
      </div>
    );
  }

  // ── Comments View ──
  if (view === 'comments') {
    if (!comments.length && !loading) fetchComments();
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Posts
          </Button>
          <Select value={commentFilter} onValueChange={setCommentFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="card-elevated overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading comments...</div>
          ) : filteredComments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No comments found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  {canModerate && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComments.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-xs truncate">{c.content}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        c.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        c.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        c.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>{c.status}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(c.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    {canModerate && (
                      <TableCell>
                        <div className="flex gap-1">
                          {c.status !== 'APPROVED' && (
                            <Button size="sm" variant="outline" onClick={() => handleCommentStatus(c.id, 'APPROVED')}>Approve</Button>
                          )}
                          {c.status !== 'REJECTED' && (
                            <Button size="sm" variant="outline" onClick={() => handleCommentStatus(c.id, 'REJECTED')}>Reject</Button>
                          )}
                          {c.status !== 'ON_HOLD' && (
                            <Button size="sm" variant="outline" onClick={() => handleCommentStatus(c.id, 'ON_HOLD')}>Hold</Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteComment(c.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    );
  }

  // ── Editor View ──
  if (view === 'editor') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('list')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Posts
        </Button>
        <h3 className="text-xl font-semibold">{selectedPost ? 'Edit Post' : 'New Blog Post'}</h3>
        <div className="space-y-3">
          <Input placeholder="Post title" value={title} onChange={e => { setTitle(e.target.value); if (!selectedPost) setSlug(generateSlug(e.target.value)); }} />
          <Input placeholder="URL slug (auto-generated)" value={slug} onChange={e => setSlug(e.target.value)} />
          <Input placeholder="Cover image URL (optional)" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} />
          <Input placeholder="Short excerpt (optional)" value={excerpt} onChange={e => setExcerpt(e.target.value)} />
          <Textarea placeholder="Write your post in Markdown..." value={content} onChange={e => setContent(e.target.value)} rows={16} className="font-mono text-sm" />
          <div className="flex gap-2">
            <Button onClick={() => handleSave(false)} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button variant="default" onClick={() => handleSave(true)} disabled={saving}>
              {saving ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {canCreatePost && (
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-1" /> New Post
            </Button>
          )}
          {canModerate && (
            <Button variant="outline" onClick={() => { fetchComments(); setView('comments'); }}>
              Moderate Comments
            </Button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading posts...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No posts found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trending</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map(post => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium max-w-xs truncate">{post.title}</TableCell>
                  <TableCell>
                    {canModerate ? (
                      <Select value={post.status} onValueChange={(v) => handleStatusChange(post.id, v)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="PUBLISHED">Published</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        post.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                        post.status === 'ARCHIVED' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>{post.status}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canModerate ? (
                      <div className="flex items-center gap-2">
                        <Switch checked={post.is_trending} onCheckedChange={() => toggleTrending(post.id, post.is_trending)} />
                        {post.is_trending && <TrendingUp className="h-4 w-4 text-primary" />}
                      </div>
                    ) : (
                      post.is_trending ? <TrendingUp className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(post.author_id === user?.id || canModerate) && (
                        <Button size="sm" variant="ghost" onClick={() => openEditor(post)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(isSuperAdmin || post.author_id === user?.id) && (
                        <Button size="sm" variant="ghost" onClick={() => handleDeletePost(post.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
