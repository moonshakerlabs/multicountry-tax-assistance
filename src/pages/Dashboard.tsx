import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { User, FileText, LogOut, FolderOpen, Upload, ChevronRight, MessageSquare, Brain, Shield, Users, CheckCircle, XCircle, Settings, Activity, CreditCard, Briefcase, ArrowLeft } from 'lucide-react';
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
  const { profile, user, signOut, isAnyAdmin, isSuperAdmin, userRoles } = useAuth();
  const { toast } = useToast();
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [adminTab, setAdminTab] = useState('moderation');

  // Admin panel state
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<string>('user_admin');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Permissions state
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const MODULES = ['employees', 'customers', 'subscriptions', 'payments', 'posts', 'moderation', 'activity_logs'];

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
        supabase.from('community_posts').select('*').order('created_at', { ascending: false }),
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
    setRolePermissions(prev => prev.map(p =>
      p.role === role && p.module === module ? { ...p, [field]: value } : p
    ));
    const { error } = await supabase
      .from('role_permissions')
      .update({ [field]: value })
      .eq('role', role as any)
      .eq('module', module);
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
            {isAnyAdmin && (
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
                  <div className="admin-section">
                    <h2 className="admin-section-title">
                      <MessageSquare className="h-5 w-5" /> Community Post Moderation
                    </h2>
                    {loadingAdmin ? (
                      <p className="text-muted-foreground">Loading posts...</p>
                    ) : pendingPosts.length === 0 ? (
                      <p className="text-muted-foreground">No posts to moderate.</p>
                    ) : (
                      <div className="admin-table-wrapper">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>Country</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingPosts.map(post => (
                              <TableRow key={post.id}>
                                <TableCell className="font-medium max-w-[200px] truncate">{post.title}</TableCell>
                                <TableCell>{post.country}</TableCell>
                                <TableCell>
                                  <span className={`admin-status-badge admin-status-${post.status.toLowerCase()}`}>
                                    {post.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {format(new Date(post.created_at), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {post.status !== 'ACTIVE' && (
                                      <Button size="sm" variant="outline" onClick={() => handlePostAction(post.id, 'ACTIVE')}>
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                                      </Button>
                                    )}
                                    {post.status !== 'SUSPENDED' && (
                                      <Button size="sm" variant="destructive" onClick={() => handlePostAction(post.id, 'SUSPENDED')}>
                                        <XCircle className="h-3.5 w-3.5 mr-1" /> Suspend
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ─── EMPLOYEES TAB ─── */}
                <TabsContent value="employees">
                  <div className="admin-section">
                    <h2 className="admin-section-title">
                      <Briefcase className="h-5 w-5" /> Employee Management
                    </h2>

                    {isSuperAdmin && (
                      <div className="admin-create-user">
                        <h3 className="text-sm font-semibold mb-2">Assign Admin Role</h3>
                        <div className="admin-create-form">
                          <Input
                            placeholder="User email (must be registered)"
                            value={newAdminEmail}
                            onChange={e => setNewAdminEmail(e.target.value)}
                            className="flex-1"
                          />
                          <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="employee_admin">Employee Admin</SelectItem>
                              <SelectItem value="user_admin">User Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button onClick={handleCreateAdmin} disabled={creatingAdmin || !newAdminEmail.trim()}>
                            {creatingAdmin ? 'Assigning...' : 'Assign Role'}
                          </Button>
                        </div>
                      </div>
                    )}

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
                                      onValueChange={(val) => handleRoleChange(u.id, val)}
                                      disabled={u.id === user?.id}
                                    >
                                      <SelectTrigger className="w-40">
                                        <SelectValue />
                                      </SelectTrigger>
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
                                      <TableCell className="capitalize font-medium">{mod.replace('_', ' ')}</TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox
                                          checked={perm?.can_read ?? false}
                                          onCheckedChange={(val) => handlePermissionChange(role, mod, 'can_read', !!val)}
                                        />
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox
                                          checked={perm?.can_write ?? false}
                                          onCheckedChange={(val) => handlePermissionChange(role, mod, 'can_write', !!val)}
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

                <Link to="/profile" className="dashboard-action-card">
                  <div className="dashboard-action-icon-wrapper">
                    <User className="dashboard-card-icon" />
                  </div>
                  <div className="dashboard-action-content">
                    <h3 className="dashboard-action-title">Edit Profile</h3>
                    <p className="dashboard-action-description">
                      Update your personal information and preferences.
                    </p>
                  </div>
                  <ChevronRight className="dashboard-action-arrow" />
                </Link>
              </div>

              <div className="dashboard-summary-section">
                <div className="dashboard-summary-header">
                  <h2 className="dashboard-summary-title">
                    <FileText className="dashboard-summary-icon" />
                    Document Summary
                  </h2>
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
                ) : (
                  <div className="dashboard-summary-grid">
                    {documentSummary.map((item, index) => (
                      <Link
                        key={index}
                        to="/vault"
                        className="dashboard-summary-card"
                      >
                        <div className="dashboard-summary-card-header">
                          <span className="dashboard-summary-country">
                            {getCountryLabel(item.country)}
                          </span>
                          <span className="dashboard-summary-year">{item.tax_year}</span>
                        </div>
                        <div className="dashboard-summary-card-body">
                          <span className="dashboard-summary-doc-count">{item.count}</span>
                          <span className="dashboard-summary-doc-label">
                            document{item.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </Link>
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
