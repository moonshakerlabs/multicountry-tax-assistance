import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { User, FileText, LogOut, FolderOpen, Upload, ChevronRight, MessageSquare, Brain, Shield, Users, CheckCircle, XCircle, Settings, Activity, CreditCard, Briefcase, ArrowLeft, HeadphonesIcon, TicketIcon, Eye, RotateCcw, X, Trash2, AlertTriangle, UserX, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import './Dashboard.css';

interface DocumentSummary {
  country: string;
  tax_year: string;
  count: number;
}

interface PendingPost {
  id: string;
  title: string;
  description: string;
  country: string;
  status: string;
  created_at: string;
  user_id: string;
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

interface RolePermission {
  id: string;
  role: string;
  module: string;
  can_read: boolean;
  can_write: boolean;
}

interface ActivityLog {
  id: string;
  user_id: string;
  role: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
}

interface CustomerDetail {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  subscription?: {
    subscription_plan: string;
    subscription_status: string;
    subscription_start_date: string;
    subscription_end_date: string | null;
    billing_cycle: string;
  } | null;
  post_count: number;
}

export default function Dashboard() {
  const { profile, user, signOut, isAnyAdmin, isSuperAdmin, userRoles, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [adminTab, setAdminTab] = useState('moderation');
  // Selected summary card filter
  const [selectedSummaryCard, setSelectedSummaryCard] = useState<{ country: string; tax_year: string } | null>(null);

  // Admin panel state
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<string>('user_admin');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Delete user state (super admin only)
  const [deleteUserTarget, setDeleteUserTarget] = useState<CustomerDetail | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Permissions state
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const MODULES = ['employees', 'customers', 'subscriptions', 'payments', 'posts', 'moderation', 'activity_logs', 'support', 'blog'];

  // Determine which roles current user can edit permissions for
  const getEditableRoles = () => {
    if (isSuperAdmin) return ['employee_admin', 'user_admin'];
    if (userRoles.includes('employee_admin')) return ['user_admin'];
    return [];
  };
  const PERMISSION_ROLES = getEditableRoles();

  // Activity logs
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Customers
  const [customers, setCustomers] = useState<CustomerDetail[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);

  // Employees
  const [employees, setEmployees] = useState<UserProfile[]>([]);

  // Stripe placeholder
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');

  const displayName = profile?.first_name
    ? profile.first_name
    : profile?.email?.split('@')[0] || 'User';

  const isProfileComplete = profile?.first_name && profile?.last_name;

  const logActivity = async (action: string, entityType?: string, entityId?: string, details?: any) => {
    if (!user) return;
    const currentRole = userRoles[0] || 'user';
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      role: currentRole,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: details || {},
    });
  };

  useEffect(() => {
    async function fetchDocumentSummary() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('country, tax_year')
          .eq('user_id', user.id);
        if (error) throw error;
        const summaryMap = new Map<string, number>();
        data?.forEach(doc => {
          const key = `${doc.country || 'Unknown'}|${doc.tax_year || 'Unknown'}`;
          summaryMap.set(key, (summaryMap.get(key) || 0) + 1);
        });
        const summary: DocumentSummary[] = Array.from(summaryMap.entries()).map(([key, count]) => {
          const [country, tax_year] = key.split('|');
          return { country, tax_year, count };
        }).sort((a, b) => b.tax_year.localeCompare(a.tax_year));
        setDocumentSummary(summary);
        setTotalDocuments(data?.length || 0);
      } catch (error) {
        console.error('Error fetching document summary:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDocumentSummary();
  }, [user]);

  useEffect(() => {
    if (adminMode && isAnyAdmin) {
      fetchAdminData();
    }
  }, [adminMode, isAnyAdmin]);

  const fetchAdminData = async () => {
    setLoadingAdmin(true);
    try {
      const [postsRes, usersRes, permsRes, logsRes, subsRes, postCountsRes] = await Promise.all([
        supabase.from('community_posts').select('*').in('status', ['PENDING', 'ACTIVE', 'REJECTED', 'REVIEW']).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('role_permissions').select('*'),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('user_subscriptions').select('*'),
        supabase.from('community_posts').select('user_id'),
      ]);

      setPendingPosts(postsRes.data || []);
      const users = (usersRes.data as UserProfile[]) || [];
      setAllUsers(users);
      setRolePermissions((permsRes.data as RolePermission[]) || []);
      setActivityLogs((logsRes.data as ActivityLog[]) || []);

      // Separate employees and customers
      const empRoles = ['super_admin', 'employee_admin', 'user_admin'];
      setEmployees(users.filter(u => empRoles.includes(u.role)));

      // Build customer details
      const customerUsers = users.filter(u => u.role === 'user');
      const subs = subsRes.data || [];
      const posts = postCountsRes.data || [];
      const postCounts = new Map<string, number>();
      posts.forEach(p => postCounts.set(p.user_id, (postCounts.get(p.user_id) || 0) + 1));

      const customerDetails: CustomerDetail[] = customerUsers.map(cu => ({
        ...cu,
        subscription: subs.find(s => s.user_id === cu.id) as any || null,
        post_count: postCounts.get(cu.id) || 0,
      }));
      setCustomers(customerDetails);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handlePermissionChange = async (role: string, module: string, field: 'can_read' | 'can_write', value: boolean) => {
    // Optimistic update — handle both existing and new rows
    setRolePermissions(prev => {
      const exists = prev.find(p => p.role === role && p.module === module);
      if (exists) {
        return prev.map(p => p.role === role && p.module === module ? { ...p, [field]: value } : p);
      } else {
        return [...prev, { id: `${role}-${module}`, role, module, can_read: field === 'can_read' ? value : false, can_write: field === 'can_write' ? value : false }];
      }
    });
    const { error } = await supabase
      .from('role_permissions')
      .upsert(
        { role: role as any, module, [field]: value },
        { onConflict: 'role,module', ignoreDuplicates: false }
      );
    if (error) {
      toast({ title: 'Error', description: 'Failed to update permission.', variant: 'destructive' });
      fetchAdminData();
    } else {
      logActivity('update_permission', 'role_permission', `${role}:${module}`, { field, value });
    }
  };

  const handlePostAction = async (postId: string, newStatus: string) => {
    const { error } = await supabase
      .from('community_posts')
      .update({ status: newStatus })
      .eq('id', postId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Post updated', description: `Post status changed to ${newStatus}.` });
      logActivity('moderate_post', 'community_post', postId, { new_status: newStatus });
      fetchAdminData();
    }
  };

  const handleSendForReview = async (post: PendingPost, reason: string) => {
    // Update post status to REVIEW
    const { error } = await supabase
      .from('community_posts')
      .update({ status: 'REVIEW' })
      .eq('id', post.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    // Get author email
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', post.user_id)
      .maybeSingle();
    if (authorProfile?.email) {
      // Send notification email via edge function
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('send-post-review-email', {
        body: {
          authorEmail: authorProfile.email,
          postTitle: post.title,
          reason,
        },
      }).catch(console.error);
    }
    toast({ title: 'Post sent for review', description: 'The author has been notified.' });
    logActivity('send_for_review', 'community_post', post.id, { reason });
    fetchAdminData();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === user?.id) {
      toast({ title: 'Not allowed', description: 'You cannot change your own role.', variant: 'destructive' });
      return;
    }
    if (!isSuperAdmin && (newRole === 'super_admin' || newRole === 'employee_admin')) {
      toast({ title: 'Not allowed', description: 'Only super admins can assign this role.', variant: 'destructive' });
      return;
    }
    try {
      const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (deleteError) throw deleteError;
      const { error: insertError } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole as any });
      if (insertError) throw insertError;
      const { error: profileError } = await supabase.from('profiles').update({ role: newRole as any }).eq('id', userId);
      if (profileError) throw profileError;
      toast({ title: 'Role updated', description: `User role changed to ${newRole}.` });
      logActivity('change_role', 'user', userId, { new_role: newRole });
      fetchAdminData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    if (!isSuperAdmin) {
      toast({ title: 'Not allowed', description: 'Only super admins can create admin users.', variant: 'destructive' });
      return;
    }
    setCreatingAdmin(true);
    try {
      const { data: targetUser, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', newAdminEmail.trim())
        .maybeSingle();
      if (error || !targetUser) {
        toast({ title: 'User not found', description: 'No user found with that email. They must sign up first.', variant: 'destructive' });
        setCreatingAdmin(false);
        return;
      }
      const { error: deleteErr } = await supabase.from('user_roles').delete().eq('user_id', targetUser.id);
      if (deleteErr) throw deleteErr;
      const { error: insertErr } = await supabase.from('user_roles').insert({ user_id: targetUser.id, role: newAdminRole as any });
      if (insertErr) throw insertErr;
      await supabase.from('profiles').update({ role: newAdminRole as any }).eq('id', targetUser.id);
      toast({ title: 'Role assigned', description: `${newAdminEmail} is now ${newAdminRole.replace('_', ' ')}.` });
      logActivity('assign_role', 'user', targetUser.id, { role: newAdminRole, email: newAdminEmail });
      setNewAdminEmail('');
      fetchAdminData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleDeleteUserAccount = async (customer: CustomerDetail) => {
    if (!isSuperAdmin) return;
    setDeletingUser(true);
    try {
      // Get user profile data for archiving
      const { data: storageData } = await supabase
        .from('user_profile')
        .select('storage_preference, google_drive_connected')
        .eq('user_id', customer.id)
        .maybeSingle();

      // Archive the user
      await supabase.from('archived_users').insert({
        original_user_id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        storage_preference: storageData?.storage_preference,
        google_drive_connected: storageData?.google_drive_connected ?? false,
        status: 'PENDING_DELETION',
        reason: 'admin_initiated',
      } as any);

      toast({ title: 'Account deletion initiated', description: `${customer.email}'s account has been queued for deletion.` });
      logActivity('delete_user_account', 'user', customer.id, { email: customer.email });
      setDeleteUserTarget(null);
      fetchAdminData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingUser(false);
    }
  };

  const getCountryLabel = (code: string) => {
    const labels: Record<string, string> = { 'GERMANY': 'Germany', 'INDIA': 'India' };
    return labels[code] || code;
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'super_admin': return 'dashboard-badge-super';
      case 'employee_admin': return 'dashboard-badge-admin';
      case 'user_admin': return 'dashboard-badge-employee';
      default: return 'dashboard-badge-user';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'employee_admin': return 'Employee Admin';
      case 'user_admin': return 'User Admin';
      case 'user': return 'Customer';
      default: return role;
    }
  };

  // ─── Moderation Tab Component ─────────────────────────────────────────
  function ModerationTab({ allPosts, loadingAdmin, handlePostAction, handleSendForReview }: {
    allPosts: PendingPost[];
    loadingAdmin: boolean;
    handlePostAction: (id: string, status: string) => Promise<void>;
    handleSendForReview: (post: PendingPost, reason: string) => Promise<void>;
  }) {
    const [selectedPost, setSelectedPost] = useState<PendingPost | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewReason, setReviewReason] = useState('');
    const [actioning, setActioning] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVIEW'>('PENDING');

    const filteredPosts = allPosts.filter(p => p.status === statusFilter);

    const statusFilterOptions: { label: string; value: typeof statusFilter; color: string }[] = [
      { label: 'Pending', value: 'PENDING', color: 'admin-status-pending' },
      { label: 'Approved', value: 'ACTIVE', color: 'admin-status-active' },
      { label: 'Rejected', value: 'REJECTED', color: 'admin-status-suspended' },
      { label: 'Sent for Review', value: 'REVIEW', color: 'admin-status-review' },
    ];

    const doAction = async (action: 'approve' | 'reject') => {
      if (!selectedPost) return;
      setActioning(true);
      if (action === 'approve') {
        await handlePostAction(selectedPost.id, 'ACTIVE');
      } else {
        await handlePostAction(selectedPost.id, 'REJECTED');
      }
      setActioning(false);
      setSelectedPost(null);
    };

    const doSendForReview = async () => {
      if (!selectedPost || !reviewReason.trim()) return;
      setActioning(true);
      await handleSendForReview(selectedPost, reviewReason.trim());
      setActioning(false);
      setReviewReason('');
      setShowReviewModal(false);
      setSelectedPost(null);
    };

    if (selectedPost) {
      return (
        <div className="admin-section">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedPost(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
          </Button>
          <h2 className="admin-section-title"><MessageSquare className="h-5 w-5" /> Post Details</h2>
          <div className="rounded-lg border p-5 mb-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold leading-snug">{selectedPost.title}</h3>
              <span className={`admin-status-badge admin-status-${selectedPost.status.toLowerCase()} shrink-0`}>{selectedPost.status}</span>
            </div>
            <div className="text-xs text-muted-foreground flex gap-4">
              <span>Country: <strong>{selectedPost.country}</strong></span>
              <span>Posted: <strong>{format(new Date(selectedPost.created_at), 'MMM d, yyyy HH:mm')}</strong></span>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{selectedPost.description}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => doAction('approve')}
              disabled={actioning || selectedPost.status === 'ACTIVE'}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => setShowReviewModal(true)}
              disabled={actioning || selectedPost.status === 'REVIEW'}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Send for Review
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => doAction('reject')}
              disabled={actioning || selectedPost.status === 'REJECTED'}
            >
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
          </div>

          {/* Send for Review reason modal */}
          {showReviewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="font-semibold text-base mb-3">Reason for Sending Back for Review</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The original poster will be notified by email with this reason.
                </p>
                <textarea
                  className="w-full border border-border rounded-lg p-3 text-sm bg-background resize-none outline-none focus:border-primary"
                  rows={4}
                  placeholder="E.g. Please revise your post to focus only on tax-related queries and remove any personal opinions..."
                  value={reviewReason}
                  onChange={e => setReviewReason(e.target.value)}
                />
                <div className="flex gap-2 mt-4 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setShowReviewModal(false); setReviewReason(''); }}>Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={!reviewReason.trim() || actioning}
                    onClick={doSendForReview}
                  >
                    {actioning ? 'Sending...' : 'Send Notification & Return Post'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="admin-section">
        <h2 className="admin-section-title"><MessageSquare className="h-5 w-5" /> Community Post Moderation</h2>
        <p className="text-sm text-muted-foreground mb-4">Click on a post to review its full content and take action.</p>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 flex-wrap mb-4">
          {statusFilterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {opt.label}
              <span className="ml-1.5 opacity-70">({allPosts.filter(p => p.status === opt.value).length})</span>
            </button>
          ))}
        </div>

        {loadingAdmin ? (
          <p className="text-muted-foreground">Loading posts...</p>
        ) : filteredPosts.length === 0 ? (
          <p className="text-muted-foreground">No {statusFilter.toLowerCase()} posts.</p>
        ) : (
          <div className="admin-table-wrapper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map(post => (
                  <TableRow key={post.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPost(post)}>
                    <TableCell className="font-medium max-w-[200px] truncate">{post.title}</TableCell>
                    <TableCell>{post.country}</TableCell>
                    <TableCell>
                      <span className={`admin-status-badge admin-status-${post.status.toLowerCase()}`}>{post.status}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(post.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedPost(post); }}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  }

  // ─── Admin Support Tab Component ─────────────────────────────────────
  function AdminSupportTab() {
    const [tickets, setAdminTickets] = useState<any[]>([]);
    const [selectedTicket, setSelectedAdminTicket] = useState<any | null>(null);
    const [adminReplies, setAdminReplies] = useState<any[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [adminReplyContent, setAdminReplyContent] = useState('');
    const [submittingAdminReply, setSubmittingAdminReply] = useState(false);

    const getPriorityClass = (priority: string) => priority === 'HIGH' ? 'admin-status-suspended' : 'admin-status-pending';

    const getEffectivePriority = (ticket: any) => {
      const hours = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
      if (hours > 24 && ticket.status === 'OPEN' && !ticket.last_reply_at) return 'HIGH';
      return ticket.priority;
    };

    useEffect(() => {
      (async () => {
        setLoadingTickets(true);
        const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
        setAdminTickets(data || []);
        setLoadingTickets(false);
      })();
    }, []);

    const openAdminTicket = async (ticket: any) => {
      setSelectedAdminTicket(ticket);
      const { data } = await supabase.from('support_ticket_replies').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
      setAdminReplies(data || []);
    };

    const sendAdminReply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTicket || !adminReplyContent.trim() || !user) return;
      setSubmittingAdminReply(true);
      try {
        await supabase.from('support_ticket_replies').insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          sender_type: 'employee',
          sender_email: profile?.email || '',
          content: adminReplyContent.trim(),
        });
        await supabase.from('support_tickets').update({ status: 'IN_PROGRESS' }).eq('id', selectedTicket.id);
        setAdminReplyContent('');
        const { data } = await supabase.from('support_ticket_replies').select('*').eq('ticket_id', selectedTicket.id).order('created_at', { ascending: true });
        setAdminReplies(data || []);
        const { data: updatedTicket } = await supabase.from('support_tickets').select('*').eq('id', selectedTicket.id).single();
        setSelectedAdminTicket(updatedTicket);
        toast({ title: 'Reply sent to customer!' });
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setSubmittingAdminReply(false);
      }
    };

    if (selectedTicket) {
      return (
        <div className="admin-section">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedAdminTicket(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to tickets
          </Button>
          <h2 className="admin-section-title"><TicketIcon className="h-5 w-5" /> {selectedTicket.ticket_number}</h2>
          <div className="rounded-lg border p-4 mb-4 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">Customer:</span> {selectedTicket.email}</div>
              <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono">{selectedTicket.meaningful_user_id}</span></div>
              <div><span className="text-muted-foreground">Category:</span> {selectedTicket.category}</div>
              <div><span className="text-muted-foreground">Status:</span> {selectedTicket.status}</div>
              <div><span className="text-muted-foreground">Priority:</span> <span className={`admin-status-badge ${getPriorityClass(getEffectivePriority(selectedTicket))}`}>{getEffectivePriority(selectedTicket)}</span></div>
              <div><span className="text-muted-foreground">Date:</span> {format(new Date(selectedTicket.created_at), 'MMM d, yyyy HH:mm')}</div>
            </div>
            <div className="pt-2 border-t"><strong>Subject:</strong> {selectedTicket.subject}</div>
          </div>
          <div className="space-y-3 mb-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold">{selectedTicket.email}</span>
                <span className="text-muted-foreground">{format(new Date(selectedTicket.created_at), 'MMM d, HH:mm')}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{selectedTicket.content}</p>
            </div>
            {adminReplies.map((r: any) => (
              <div key={r.id} className={`rounded-lg border p-4 ${r.sender_type === 'employee' ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold">{r.sender_type === 'employee' ? '🛡️ Support Team' : r.sender_email}</span>
                  <span className="text-muted-foreground">{format(new Date(r.created_at), 'MMM d, HH:mm')}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{r.content}</p>
              </div>
            ))}
          </div>
          {selectedTicket.status !== 'CLOSED' && (
            <form onSubmit={sendAdminReply} className="space-y-3">
              <textarea
                value={adminReplyContent}
                onChange={e => setAdminReplyContent(e.target.value)}
                placeholder="Write your reply to the customer..."
                rows={4}
                className="w-full p-3 border border-border rounded-lg bg-background text-sm resize-y outline-none focus:border-primary"
                required
              />
              <Button type="submit" disabled={submittingAdminReply || !adminReplyContent.trim()}>
                {submittingAdminReply ? 'Sending...' : 'Send Reply to Customer'}
              </Button>
            </form>
          )}
        </div>
      );
    }

    return (
      <div className="admin-section">
        <h2 className="admin-section-title"><TicketIcon className="h-5 w-5" /> Support Tickets</h2>
        {loadingTickets ? (
          <p className="text-muted-foreground">Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p className="text-muted-foreground">No support tickets yet.</p>
        ) : (
          <div className="admin-table-wrapper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t: any) => {
                  const priority = getEffectivePriority(t);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs text-primary">{t.ticket_number}</TableCell>
                      <TableCell className="font-mono text-xs">{t.meaningful_user_id}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm">{t.email}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{t.subject}</TableCell>
                      <TableCell><span className={`admin-status-badge ${getPriorityClass(priority)}`}>{priority}</span></TableCell>
                      <TableCell>
                        <span className={`admin-status-badge ${t.status === 'OPEN' ? 'admin-status-pending' : t.status === 'IN_PROGRESS' ? 'admin-status-active' : 'admin-status-suspended'}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(t.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => openAdminTicket(t)}>Open</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────

  // ─── Employees Tab Component ──────────────────────────────────────────
  function EmployeesTab({ employees, loadingAdmin, isSuperAdmin, currentUserId, onRoleChange, onRefresh, createdBy }: {
    employees: UserProfile[];
    loadingAdmin: boolean;
    isSuperAdmin: boolean;
    currentUserId?: string;
    onRoleChange: (userId: string, newRole: string) => Promise<void>;
    onRefresh: () => void;
    createdBy?: string;
  }) {
    const { toast: empToast } = useToast();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
      first_name: '',
      last_name: '',
      employee_id: '',
      email: '',
      phone_number: '',
      role: 'user_admin',
      joined_date: '',
      resigned_date: '',
      employment_status: 'ACTIVE',
      address: '',
      pan_number: '',
      uan_number: '',
    });

    const handleFormChange = (field: string, value: string) => {
      setForm(prev => ({ ...prev, [field]: value }));
    };

    const isFormValid = () =>
      form.first_name.trim() && form.last_name.trim() && form.employee_id.trim() &&
      form.email.trim() && form.phone_number.trim() && form.joined_date;

    const handleCreateEmployee = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isFormValid()) return;
      setSaving(true);
      try {
        // Check if email exists in profiles
        const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', form.email.trim()).maybeSingle();

        // Insert employee profile
        const insertData: any = {
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          employee_id: form.employee_id.trim(),
          phone_number: form.phone_number.trim(),
          role: form.role,
          joined_date: form.joined_date,
          employment_status: form.employment_status,
          created_by: createdBy,
        };
        if (form.resigned_date) insertData.resigned_date = form.resigned_date;
        if (form.address) insertData.address = form.address.trim();
        if (form.pan_number) insertData.pan_number = form.pan_number.trim();
        if (form.uan_number) insertData.uan_number = form.uan_number.trim();
        if (targetUser) insertData.user_id = targetUser.id;

        const { error: empErr } = await supabase.from('employee_profiles' as any).insert(insertData);
        if (empErr) throw empErr;

        // If user exists, also assign the role
        if (targetUser) {
          await supabase.from('user_roles').delete().eq('user_id', targetUser.id);
          await supabase.from('user_roles').insert({ user_id: targetUser.id, role: form.role as any });
          await supabase.from('profiles').update({ role: form.role as any, first_name: form.first_name.trim(), last_name: form.last_name.trim() }).eq('id', targetUser.id);
        }

        empToast({ title: 'Employee added!', description: targetUser ? 'Employee profile created and role assigned.' : 'Employee profile created. They can complete their profile after signing up.' });
        setShowCreateForm(false);
        setForm({ first_name: '', last_name: '', employee_id: '', email: '', phone_number: '', role: 'user_admin', joined_date: '', resigned_date: '', employment_status: 'ACTIVE', address: '', pan_number: '', uan_number: '' });
        onRefresh();
      } catch (err: any) {
        empToast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="admin-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="admin-section-title mb-0">
            <Briefcase className="h-5 w-5" /> Employee Management
          </h2>
          {isSuperAdmin && (
            <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)} variant={showCreateForm ? 'outline' : 'default'}>
              <UserPlus className="h-4 w-4 mr-1" />
              {showCreateForm ? 'Cancel' : 'Add Employee'}
            </Button>
          )}
        </div>

        {/* Create Employee Form */}
        {isSuperAdmin && showCreateForm && (
          <form onSubmit={handleCreateEmployee} className="admin-create-employee-form">
            <h3 className="admin-create-employee-title">New Employee / Admin Details</h3>
            <p className="admin-create-employee-subtitle">
              Fields marked <span className="text-destructive">*</span> are mandatory. Other details can be filled by the employee later.
            </p>

            <div className="admin-employee-form-grid">
              {/* Mandatory fields */}
              <div className="admin-form-field">
                <label className="admin-form-label">First Name <span className="text-destructive">*</span></label>
                <Input value={form.first_name} onChange={e => handleFormChange('first_name', e.target.value)} placeholder="e.g. Priya" required />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Last Name <span className="text-destructive">*</span></label>
                <Input value={form.last_name} onChange={e => handleFormChange('last_name', e.target.value)} placeholder="e.g. Sharma" required />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Employee ID <span className="text-destructive">*</span></label>
                <Input value={form.employee_id} onChange={e => handleFormChange('employee_id', e.target.value)} placeholder="e.g. EMP-2024-001" required />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Email Address <span className="text-destructive">*</span></label>
                <Input type="email" value={form.email} onChange={e => handleFormChange('email', e.target.value)} placeholder="employee@company.com" required />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Phone Number <span className="text-destructive">*</span></label>
                <Input type="tel" value={form.phone_number} onChange={e => handleFormChange('phone_number', e.target.value)} placeholder="+49 123 456789" required />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Role <span className="text-destructive">*</span></label>
                <Select value={form.role} onValueChange={v => handleFormChange('role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee_admin">Employee Admin</SelectItem>
                    <SelectItem value="user_admin">User Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Joined Date <span className="text-destructive">*</span></label>
                <Input type="date" value={form.joined_date} onChange={e => handleFormChange('joined_date', e.target.value)} required />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Employment Status <span className="text-destructive">*</span></label>
                <Select value={form.employment_status} onValueChange={v => handleFormChange('employment_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                    <SelectItem value="RESIGNED">Resigned</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Optional fields */}
              <div className="admin-form-field">
                <label className="admin-form-label">Resigned Date <span className="admin-form-optional">(optional)</span></label>
                <Input type="date" value={form.resigned_date} onChange={e => handleFormChange('resigned_date', e.target.value)} />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">PAN Number <span className="admin-form-optional">(optional)</span></label>
                <Input value={form.pan_number} onChange={e => handleFormChange('pan_number', e.target.value)} placeholder="ABCDE1234F" />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">UAN Number <span className="admin-form-optional">(optional)</span></label>
                <Input value={form.uan_number} onChange={e => handleFormChange('uan_number', e.target.value)} placeholder="100XXXXXXXXX" />
              </div>
              <div className="admin-form-field admin-form-field-full">
                <label className="admin-form-label">Address <span className="admin-form-optional">(optional)</span></label>
                <Input value={form.address} onChange={e => handleFormChange('address', e.target.value)} placeholder="Street, City, Country" />
              </div>
            </div>

            <div className="admin-form-actions">
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !isFormValid()}>
                {saving ? 'Creating...' : 'Create Employee Profile'}
              </Button>
            </div>
          </form>
        )}

        {/* Employee List */}
        {loadingAdmin ? (
          <p className="text-muted-foreground">Loading employees...</p>
        ) : employees.length === 0 ? (
          <p className="text-muted-foreground">No employees found.</p>
        ) : (
          <div className="admin-table-wrapper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {isSuperAdmin && <TableHead>Change Role</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : <span className="text-muted-foreground">Not set</span>}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <span className={`dashboard-role-badge ${getRoleBadgeClass(u.role)}`}>{getRoleLabel(u.role)}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(u.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(val) => onRoleChange(u.id, val)}
                          disabled={u.id === currentUserId}
                        >
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Customer</SelectItem>
                            <SelectItem value="user_admin">User Admin</SelectItem>
                            <SelectItem value="employee_admin">Employee Admin</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-logo">
            <Link to="/" className="dashboard-logo-link">
              <div className="dashboard-logo-icon" />
              <span className="dashboard-logo-text">WorTaF</span>
            </Link>
          </div>
          <div className="dashboard-header-actions">
            {!authLoading && isAnyAdmin && (
              <div className="dashboard-mode-toggle">
                <span className={`dashboard-mode-label ${!adminMode ? 'active' : ''}`}>
                  <User className="h-3.5 w-3.5" /> Customer
                </span>
                <Switch checked={adminMode} onCheckedChange={setAdminMode} />
                <span className={`dashboard-mode-label ${adminMode ? 'active' : ''}`}>
                  <Shield className="h-3.5 w-3.5" /> Admin
                </span>
              </div>
            )}
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard">Dashboard</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/profile">Profile</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/community">TaxOverFlow</Link></Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ai-tools"><Brain className="dashboard-action-icon" />AI Tools</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/support"><HeadphonesIcon className="dashboard-action-icon" />Support</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="dashboard-action-icon" />Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          {adminMode && isAnyAdmin ? (
            <div className="admin-panel">
              <div className="dashboard-welcome">
                <h1 className="dashboard-title">
                  <Shield className="inline h-8 w-8 mr-2 text-primary" />
                  Admin Panel
                </h1>
                <p className="dashboard-subtitle">
                  Role: <span className={`dashboard-role-badge ${getRoleBadgeClass(userRoles[0] || 'user')}`}>{getRoleLabel(userRoles[0] || 'user')}</span>
                </p>
              </div>

              <Tabs value={adminTab} onValueChange={setAdminTab} className="w-full">
                <TabsList className="w-full flex flex-wrap gap-1 h-auto p-1">
                  <TabsTrigger value="moderation" className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> Moderation
                  </TabsTrigger>
                  <TabsTrigger value="employees" className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" /> Employees
                  </TabsTrigger>
                  <TabsTrigger value="customers" className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> Customers
                  </TabsTrigger>
                  <TabsTrigger value="support" className="flex items-center gap-1">
                    <TicketIcon className="h-3.5 w-3.5" /> Support Tickets
                  </TabsTrigger>
                  <TabsTrigger value="permissions" className="flex items-center gap-1">
                    <Settings className="h-3.5 w-3.5" /> Permissions
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5" /> Activity Logs
                  </TabsTrigger>
                  {isSuperAdmin && (
                    <TabsTrigger value="stripe" className="flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" /> Payments
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* ─── MODERATION TAB ─── */}
                <TabsContent value="moderation">
                  <ModerationTab
                    allPosts={pendingPosts}
                    loadingAdmin={loadingAdmin}
                    handlePostAction={handlePostAction}
                    handleSendForReview={handleSendForReview}
                  />
                </TabsContent>

                {/* ─── EMPLOYEES TAB ─── */}
                <TabsContent value="employees">
                  <EmployeesTab
                    employees={employees}
                    loadingAdmin={loadingAdmin}
                    isSuperAdmin={isSuperAdmin}
                    currentUserId={user?.id}
                    onRoleChange={handleRoleChange}
                    onRefresh={fetchAdminData}
                    createdBy={user?.id}
                  />
                </TabsContent>

                {/* ─── CUSTOMERS TAB ─── */}
                <TabsContent value="customers">
                  <div className="admin-section">
                    <h2 className="admin-section-title">
                      <Users className="h-5 w-5" /> Customer Management
                    </h2>

                    {selectedCustomer ? (
                      <div>
                        <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedCustomer(null)}>
                          <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
                        </Button>
                        <div className="rounded-lg border p-6 space-y-4">
                          <h3 className="text-lg font-semibold">
                            {selectedCustomer.first_name && selectedCustomer.last_name
                              ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                              : selectedCustomer.email}
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-muted-foreground">Email:</span> {selectedCustomer.email}</div>
                            <div><span className="text-muted-foreground">Posts:</span> {selectedCustomer.post_count}</div>
                            <div><span className="text-muted-foreground">Joined:</span> {format(new Date(selectedCustomer.created_at), 'MMM d, yyyy')}</div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>{' '}
                              <span className={`admin-status-badge ${selectedCustomer.subscription?.subscription_status === 'ACTIVE' ? 'admin-status-active' : 'admin-status-suspended'}`}>
                                {selectedCustomer.subscription?.subscription_status || 'No subscription'}
                              </span>
                            </div>
                          </div>
                          {selectedCustomer.subscription && (
                            <div className="border-t pt-4 mt-4 space-y-2">
                              <h4 className="font-semibold text-sm">Subscription Details</h4>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-muted-foreground">Plan:</span> {selectedCustomer.subscription.subscription_plan}</div>
                                <div><span className="text-muted-foreground">Billing:</span> {selectedCustomer.subscription.billing_cycle}</div>
                                <div><span className="text-muted-foreground">Start:</span> {format(new Date(selectedCustomer.subscription.subscription_start_date), 'MMM d, yyyy')}</div>
                                <div><span className="text-muted-foreground">End:</span> {selectedCustomer.subscription.subscription_end_date ? format(new Date(selectedCustomer.subscription.subscription_end_date), 'MMM d, yyyy') : '—'}</div>
                              </div>
                            </div>
                          )}
                          {isSuperAdmin && (
                            <div className="border-t pt-4 mt-4">
                              <h4 className="font-semibold text-sm text-destructive mb-2">Danger Zone</h4>
                              {deleteUserTarget?.id === selectedCustomer.id ? (
                                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                                  <p className="text-sm text-destructive font-medium">
                                    Are you sure you want to delete this account? This will queue the account for permanent deletion within 30 days.
                                  </p>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="destructive" disabled={deletingUser} onClick={() => handleDeleteUserAccount(selectedCustomer)}>
                                      {deletingUser ? 'Processing...' : 'Yes, Delete Account'}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setDeleteUserTarget(null)}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <Button size="sm" variant="destructive" onClick={() => setDeleteUserTarget(selectedCustomer)}>
                                  <UserX className="h-4 w-4 mr-1" /> Delete Customer Account
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : loadingAdmin ? (
                      <p className="text-muted-foreground">Loading customers...</p>
                    ) : customers.length === 0 ? (
                      <p className="text-muted-foreground">No customers found.</p>
                    ) : (
                      <div className="admin-table-wrapper">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Plan</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Posts</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customers.map(c => (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium">
                                  {c.first_name && c.last_name ? `${c.first_name} ${c.last_name}` : <span className="text-muted-foreground">Not set</span>}
                                </TableCell>
                                <TableCell>{c.email}</TableCell>
                                <TableCell>{c.subscription?.subscription_plan || 'FREE'}</TableCell>
                                <TableCell>
                                  <span className={`admin-status-badge ${c.subscription?.subscription_status === 'ACTIVE' ? 'admin-status-active' : 'admin-status-suspended'}`}>
                                    {c.subscription?.subscription_status || 'N/A'}
                                  </span>
                                </TableCell>
                                <TableCell>{c.post_count}</TableCell>
                                <TableCell>
                                  <Button size="sm" variant="outline" onClick={() => setSelectedCustomer(c)}>
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ─── SUPPORT TICKETS TAB ─── */}
                <TabsContent value="support">
                  <AdminSupportTab />
                </TabsContent>

                {/* ─── PERMISSIONS TAB ─── */}
                <TabsContent value="permissions">
                  <div className="admin-section">
                    <h2 className="admin-section-title">
                      <Settings className="h-5 w-5" /> Role Permission Management
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure module access for each role. Super Admins always have full access.
                    </p>
                    {PERMISSION_ROLES.length === 0 ? (
                      <p className="text-muted-foreground">You don't have permission to edit role configurations.</p>
                    ) : (
                      PERMISSION_ROLES.map(role => (
                        <div key={role} className="mb-6">
                          <h3 className="text-sm font-semibold mb-2">
                            <span className={`dashboard-role-badge ${getRoleBadgeClass(role)}`}>{getRoleLabel(role)}</span>
                          </h3>
                          <div className="admin-table-wrapper">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Module</TableHead>
                                  <TableHead className="text-center">Read</TableHead>
                                  <TableHead className="text-center">Write</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {MODULES.map(mod => {
                                  const perm = rolePermissions.find(p => p.role === role && p.module === mod);
                                  return (
                               <TableRow key={mod}>
                                      <TableCell className="capitalize font-medium">{mod.replace(/_/g, ' ')}</TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox
                                          checked={perm?.can_read ?? false}
                                          onCheckedChange={(val) => handlePermissionChange(role, mod, 'can_read', !!val)}
                                          className="cursor-pointer"
                                        />
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox
                                          checked={perm?.can_write ?? false}
                                          onCheckedChange={(val) => handlePermissionChange(role, mod, 'can_write', !!val)}
                                          className="cursor-pointer"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* ─── ACTIVITY LOGS TAB ─── */}
                <TabsContent value="activity">
                  <div className="admin-section">
                    <h2 className="admin-section-title">
                      <Activity className="h-5 w-5" /> Activity Logs
                    </h2>
                    {loadingAdmin ? (
                      <p className="text-muted-foreground">Loading logs...</p>
                    ) : activityLogs.length === 0 ? (
                      <p className="text-muted-foreground">No activity logs yet. Actions will be recorded as they happen.</p>
                    ) : (
                      <div className="admin-table-wrapper">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Timestamp</TableHead>
                              <TableHead>User ID</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Entity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activityLogs.map(log => (
                              <TableRow key={log.id}>
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                  {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                                </TableCell>
                                <TableCell className="text-xs font-mono max-w-[100px] truncate">{log.user_id}</TableCell>
                                <TableCell>
                                  <span className={`dashboard-role-badge ${getRoleBadgeClass(log.role)}`}>{getRoleLabel(log.role)}</span>
                                </TableCell>
                                <TableCell className="font-medium">{log.action.replace('_', ' ')}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {log.entity_type ? `${log.entity_type}` : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ─── STRIPE PLACEHOLDER TAB ─── */}
                {isSuperAdmin && (
                  <TabsContent value="stripe">
                    <div className="admin-section">
                      <h2 className="admin-section-title">
                        <CreditCard className="h-5 w-5" /> Payment Integration (Stripe)
                      </h2>
                      <p className="text-sm text-muted-foreground mb-4">
                        Configure your Stripe keys to enable payment processing. Payment features will be activated once keys are saved.
                      </p>
                      <div className="space-y-4 max-w-md">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Publishable Key</label>
                          <Input
                            placeholder="pk_live_..."
                            value={stripePublishableKey}
                            onChange={(e) => setStripePublishableKey(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Secret Key</label>
                          <Input
                            type="password"
                            placeholder="sk_live_..."
                            value={stripeSecretKey}
                            onChange={(e) => setStripeSecretKey(e.target.value)}
                          />
                        </div>
                        <Button
                          disabled
                          className="opacity-60"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Save Keys (Coming Soon)
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Payment processing is not yet active. Keys will be securely stored when this feature is enabled.
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          ) : (
            /* ─── CUSTOMER PANEL ─── */
            <>
              <div className="dashboard-welcome">
                <h1 className="dashboard-title">Welcome, {displayName}</h1>
                <p className="dashboard-subtitle">
                  Manage your cross-border tax documents in one place.
                </p>
              </div>

              {!isProfileComplete && (
                <div className="dashboard-alert">
                  <p className="dashboard-alert-text">
                    <strong>Complete your profile to get started.</strong>
                    {' '}Add your name and preferences to personalize your experience.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/profile">Complete Profile</Link>
                  </Button>
                </div>
              )}

              <div className="dashboard-actions-grid">
                <Link to="/vault" className="dashboard-action-card dashboard-action-primary">
                  <div className="dashboard-action-icon-wrapper dashboard-action-icon-primary">
                    <FolderOpen className="dashboard-card-icon" />
                  </div>
                  <div className="dashboard-action-content">
                    <h3 className="dashboard-action-title">Document Vault</h3>
                    <p className="dashboard-action-description">
                      View, upload, and organize your tax documents.
                    </p>
                  </div>
                  <ChevronRight className="dashboard-action-arrow" />
                </Link>
              </div>

              <div className="dashboard-summary-section">
                <div className="dashboard-summary-header">
                  <div className="flex items-center gap-2">
                    <h2 className="dashboard-summary-title">
                      <FileText className="dashboard-summary-icon" />
                      Document Summary
                    </h2>
                    {selectedSummaryCard && (
                      <button
                        onClick={() => setSelectedSummaryCard(null)}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> All
                      </button>
                    )}
                  </div>
                  {totalDocuments > 0 && (
                    <span className="dashboard-summary-count">
                      {totalDocuments} document{totalDocuments !== 1 ? 's' : ''} total
                    </span>
                  )}
                </div>

                {isLoading ? (
                  <div className="dashboard-summary-loading">Loading...</div>
                ) : totalDocuments === 0 ? (
                  <div className="dashboard-summary-empty">
                    <FolderOpen className="dashboard-empty-icon" />
                    <h3 className="dashboard-empty-title">No documents yet</h3>
                    <p className="dashboard-empty-text">
                      Upload your first document to get started.
                    </p>
                    <Button asChild>
                      <Link to="/vault">
                        <Upload className="dashboard-btn-icon" />
                        Go to Document Vault
                      </Link>
                    </Button>
                  </div>
                ) : selectedSummaryCard ? (
                  /* ── Filtered view: show only documents for selected card ── */
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Showing documents for <strong>{selectedSummaryCard.tax_year} · {getCountryLabel(selectedSummaryCard.country)}</strong>
                    </p>
                    <Button
                      asChild
                      variant="default"
                    >
                      <Link to={`/vault?country=${encodeURIComponent(selectedSummaryCard.country)}&year=${encodeURIComponent(selectedSummaryCard.tax_year)}`}>
                        <FolderOpen className="dashboard-btn-icon" />
                        Open in Document Vault
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="dashboard-summary-grid">
                    {documentSummary.map((item, index) => (
                      <div
                        key={index}
                        className="dashboard-summary-card"
                        onClick={() => setSelectedSummaryCard({ country: item.country, tax_year: item.tax_year })}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="dashboard-summary-card-header">
                          <span className="dashboard-summary-year">{item.tax_year}</span>
                          <span className="dashboard-summary-country">
                            {getCountryLabel(item.country)}
                          </span>
                        </div>
                        <div className="dashboard-summary-card-body">
                          <span className="dashboard-summary-doc-count">{item.count}</span>
                          <span className="dashboard-summary-doc-label">
                            document{item.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
