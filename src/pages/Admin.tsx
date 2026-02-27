import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  LogOut,
  Users,
  BookOpen,
  MessageSquare,
  Shield,
  HelpCircle,
  HeadphonesIcon,
  Settings,
} from 'lucide-react';
import { APP_NAME } from '@/lib/appConfig';
import AdminUsersTab from '@/components/admin/AdminUsersTab';
import AdminBlogTab from '@/components/admin/AdminBlogTab';
import AdminPrivacyPolicyTab from '@/components/admin/AdminPrivacyPolicyTab';
import AdminFaqTab from '@/components/admin/AdminFaqTab';
import AdminPlaceholder from '@/components/admin/AdminPlaceholder';
import AdminPlanManagementTab from '@/components/admin/AdminPlanManagementTab';
import AdminSettingsTab from '@/components/admin/AdminSettingsTab';
import AdminFeedbackTab from '@/components/admin/AdminFeedbackTab';
import { CreditCard, Star } from 'lucide-react';

type AdminSection =
  | 'users'
  | 'employees'
  | 'permissions'
  | 'plans'
  | 'blog'
  | 'taxoverflow'
  | 'privacy-policy'
  | 'faq'
  | 'support'
  | 'feedback'
  | 'settings';

const sidebarItems: { section: AdminSection; label: string; icon: React.ComponentType<{ className?: string }>; group: string }[] = [
  { section: 'users', label: 'Users', icon: Users, group: 'Management' },
  { section: 'employees', label: 'Employees', icon: Users, group: 'Management' },
  { section: 'permissions', label: 'Permissions', icon: Settings, group: 'Management' },
  { section: 'plans', label: 'Plans & Pricing', icon: CreditCard, group: 'Management' },
  { section: 'blog', label: 'Blog', icon: BookOpen, group: 'Moderations' },
  { section: 'taxoverflow', label: 'Tax Overflow', icon: MessageSquare, group: 'Moderations' },
  { section: 'privacy-policy', label: 'Privacy Policy', icon: Shield, group: 'Content' },
  { section: 'faq', label: 'FAQ', icon: HelpCircle, group: 'Content' },
  { section: 'support', label: 'Support Tickets', icon: HeadphonesIcon, group: 'Support' },
  { section: 'feedback', label: 'Feedback', icon: Star, group: 'Support' },
  { section: 'settings', label: 'Settings', icon: Settings, group: 'System' },
];

const groups = ['Management', 'Moderations', 'Content', 'Support', 'System'];

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
      case 'plans':
        return <AdminPlanManagementTab />;
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
      case 'feedback':
        return <AdminFeedbackTab />;
      case 'settings':
        return <AdminSettingsTab />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ height: 32, width: 32, borderRadius: 8, background: 'hsl(var(--primary))' }} />
            <span style={{ fontSize: 18, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{APP_NAME}</span>
          </Link>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 4, background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>{profile?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="md:hidden" style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', padding: '8px 16px' }}>
        <select
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as AdminSection)}
          style={{ width: '100%', borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', padding: '8px 12px', fontSize: 14 }}
        >
          {sidebarItems.map((item) => (
            <option key={item.section} value={item.section}>
              {item.group} › {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar - desktop only */}
        <aside className="hidden md:block" style={{ width: 224, flexShrink: 0, borderRight: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', minHeight: 'calc(100vh - 64px)' }}>
          <nav style={{ padding: '16px 0' }}>
            {groups.map((group) => (
              <div key={group} style={{ marginBottom: 16 }}>
                <h3 style={{ padding: '0 16px', marginBottom: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))' }}>
                  {group}
                </h3>
                {sidebarItems
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.section;
                    return (
                      <button
                        key={item.section}
                        onClick={() => setActiveSection(item.section)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 16px',
                          fontSize: 14,
                          fontWeight: 500,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: isActive ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                          color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                          borderRight: isActive ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: 32, minWidth: 0 }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
