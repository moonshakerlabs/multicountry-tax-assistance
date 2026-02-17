import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { User, FileText, LogOut, FolderOpen, Upload, ChevronRight, MessageSquare, Brain, Shield, Users, CheckCircle, XCircle, Eye, Settings } from 'lucide-react';
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

export default function Dashboard() {
  const { profile, user, signOut, isAnyAdmin, isSuperAdmin, userRoles } = useAuth();
  const { toast } = useToast();
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);

  // Admin panel state
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<string>('employee_admin');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Permissions state
  interface RolePermission {
    id: string;
    role: string;
    module: string;
    can_read: boolean;
    can_write: boolean;
  }
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const MODULES = ['employees', 'customers', 'subscriptions', 'payments', 'posts', 'moderation', 'activity_logs'];
  const PERMISSION_ROLES = ['admin', 'employee_admin'];

  const displayName = profile?.first_name 
    ? profile.first_name 
    : profile?.email?.split('@')[0] || 'User';

  const isProfileComplete = profile?.first_name && profile?.last_name;

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

  // Fetch admin data when admin mode is toggled on
  useEffect(() => {
    if (adminMode && isAnyAdmin) {
      fetchAdminData();
    }
  }, [adminMode, isAnyAdmin]);

  const fetchAdminData = async () => {
    setLoadingAdmin(true);
    try {
      const [postsRes, usersRes, permsRes] = await Promise.all([
        supabase.from('community_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('role_permissions').select('*'),
      ]);
      
      setPendingPosts(postsRes.data || []);
      setAllUsers((usersRes.data as UserProfile[]) || []);
      setRolePermissions((permsRes.data as RolePermission[]) || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handlePermissionChange = async (role: string, module: string, field: 'can_read' | 'can_write', value: boolean) => {
    // Optimistic update
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
      fetchAdminData(); // revert
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
      fetchAdminData();
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === user?.id) {
      toast({ title: 'Not allowed', description: 'You cannot change your own role.', variant: 'destructive' });
      return;
    }

    // Only super_admin can assign super_admin or employee_admin roles
    if (!isSuperAdmin && (newRole === 'super_admin' || newRole === 'employee_admin')) {
      toast({ title: 'Not allowed', description: 'Only super admins can assign admin roles.', variant: 'destructive' });
      return;
    }

    try {
      // Update user_roles table
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole as any });
      
      if (insertError) throw insertError;

      // Also update profiles table role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: newRole as any })
        .eq('id', userId);
      
      if (profileError) throw profileError;

      toast({ title: 'Role updated', description: `User role changed to ${newRole}.` });
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
      // Find user by email in profiles
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

      // Update their role in user_roles
      const { error: deleteErr } = await supabase.from('user_roles').delete().eq('user_id', targetUser.id);
      if (deleteErr) throw deleteErr;

      const { error: insertErr } = await supabase.from('user_roles').insert({ user_id: targetUser.id, role: newAdminRole as any });
      if (insertErr) throw insertErr;

      // Update profiles table
      await supabase.from('profiles').update({ role: newAdminRole as any }).eq('id', targetUser.id);

      toast({ title: 'Admin created', description: `${newAdminEmail} is now a ${newAdminRole}.` });
      setNewAdminEmail('');
      fetchAdminData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCreatingAdmin(false);
    }
  };

  const getCountryLabel = (code: string) => {
    const labels: Record<string, string> = {
      'GERMANY': 'Germany',
      'INDIA': 'India',
    };
    return labels[code] || code;
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'super_admin': return 'dashboard-badge-super';
      case 'admin': return 'dashboard-badge-admin';
      case 'employee_admin': return 'dashboard-badge-employee';
      default: return 'dashboard-badge-user';
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
                <Switch
                  checked={adminMode}
                  onCheckedChange={setAdminMode}
                />
                <span className={`dashboard-mode-label ${adminMode ? 'active' : ''}`}>
                  <Shield className="h-3.5 w-3.5" /> Admin
                </span>
              </div>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/profile">Profile</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/community">TaxOverFlow</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ai-tools">
                <Brain className="dashboard-action-icon" />
                AI Tools
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="dashboard-action-icon" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          {adminMode && isAnyAdmin ? (
            /* ─── ADMIN PANEL ─── */
            <div className="admin-panel">
              <div className="dashboard-welcome">
                <h1 className="dashboard-title">
                  <Shield className="inline h-8 w-8 mr-2 text-primary" />
                  Admin Panel
                </h1>
                <p className="dashboard-subtitle">
                  Moderate content and manage users. Role: <span className={`dashboard-role-badge ${getRoleBadgeClass(userRoles[0] || 'user')}`}>{userRoles[0] || 'user'}</span>
                </p>
              </div>

              {/* Post Moderation */}
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

              {/* User Management */}
              <div className="admin-section">
                <h2 className="admin-section-title">
                  <Users className="h-5 w-5" /> User Management
                </h2>

                {/* Create Admin (super_admin only) */}
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
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleCreateAdmin} disabled={creatingAdmin || !newAdminEmail.trim()}>
                        {creatingAdmin ? 'Assigning...' : 'Assign Role'}
                      </Button>
                    </div>
                  </div>
                )}

                {loadingAdmin ? (
                  <p className="text-muted-foreground">Loading users...</p>
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
                        {allUsers.map(u => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">
                              {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : <span className="text-muted-foreground">Not set</span>}
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <span className={`dashboard-role-badge ${getRoleBadgeClass(u.role)}`}>{u.role}</span>
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
                                  <SelectTrigger className="w-36">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
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

              {/* Permission Management (Super Admin only) */}
              {isSuperAdmin && (
                <div className="admin-section">
                  <h2 className="admin-section-title">
                    <Settings className="h-5 w-5" /> Role Permission Management
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure module access for each role. Super Admins always have full access.
                  </p>
                  {PERMISSION_ROLES.map(role => (
                    <div key={role} className="mb-6">
                      <h3 className="text-sm font-semibold mb-2 capitalize">
                        <span className={`dashboard-role-badge ${getRoleBadgeClass(role)}`}>{role.replace('_', ' ')}</span>
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
                  ))}
                </div>
              )}
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
