import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';
import { APP_NAME } from '@/lib/appConfig';
import AdminSidebar, { AdminMobileNav, type AdminSection } from '@/components/admin/AdminSidebar';
import AdminUsersTab from '@/components/admin/AdminUsersTab';
import AdminBlogTab from '@/components/admin/AdminBlogTab';
import AdminPrivacyPolicyTab from '@/components/admin/AdminPrivacyPolicyTab';
import AdminFaqTab from '@/components/admin/AdminFaqTab';
import AdminPlaceholder from '@/components/admin/AdminPlaceholder';

export default function Admin() {
  const { profile, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>('users');

  const renderContent = () => {
    switch (activeSection) {
      case 'users':
        return <AdminUsersTab />;
      case 'employees':
        return <AdminPlaceholder title="Employee Management" description="Manage employee profiles, onboarding, and role assignments." />;
      case 'permissions':
        return <AdminPlaceholder title="Permission Management" description="Configure module-level read/write permissions for each role." />;
      case 'blog':
        return <AdminBlogTab />;
      case 'taxoverflow':
        return <AdminPlaceholder title="Tax Overflow Moderation" description="Moderate community posts, answers, and reported content." />;
      case 'privacy-policy':
        return <AdminPrivacyPolicyTab />;
      case 'faq':
        return <AdminFaqTab />;
      case 'support':
        return <AdminPlaceholder title="Support Tickets" description="View and respond to user support tickets." />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary" />
              <span className="text-lg font-semibold text-foreground">{APP_NAME}</span>
            </Link>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-primary/10 text-primary uppercase tracking-wider">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">{profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <AdminMobileNav active={activeSection} onChange={setActiveSection} />

      <div className="flex">
        <AdminSidebar active={activeSection} onChange={setActiveSection} />
        <main className="flex-1 p-6 sm:p-8 min-w-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
