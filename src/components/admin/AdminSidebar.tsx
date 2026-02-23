import { Users, BookOpen, MessageSquare, Shield, HelpCircle, HeadphonesIcon, Settings } from 'lucide-react';

export type AdminSection =
  | 'users'
  | 'employees'
  | 'permissions'
  | 'blog'
  | 'taxoverflow'
  | 'privacy-policy'
  | 'faq'
  | 'support';

interface SidebarGroup {
  label: string;
  items: { key: AdminSection; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    label: 'Management',
    items: [
      { key: 'users', label: 'Users', icon: Users },
      { key: 'employees', label: 'Employees', icon: Users },
      { key: 'permissions', label: 'Permissions', icon: Settings },
    ],
  },
  {
    label: 'Moderations',
    items: [
      { key: 'blog', label: 'Blog', icon: BookOpen },
      { key: 'taxoverflow', label: 'Tax Overflow', icon: MessageSquare },
    ],
  },
  {
    label: 'Content',
    items: [
      { key: 'privacy-policy', label: 'Privacy Policy', icon: Shield },
      { key: 'faq', label: 'FAQ', icon: HelpCircle },
    ],
  },
  {
    label: 'Support',
    items: [
      { key: 'support', label: 'Support Tickets', icon: HeadphonesIcon },
    ],
  },
];

interface AdminSidebarProps {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
}

export default function AdminSidebar({ active, onChange }: AdminSidebarProps) {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card min-h-[calc(100vh-4rem)] hidden md:block">
      <nav className="py-4">
        {sidebarGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <h3 className="px-4 mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </h3>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onChange(item.key)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary border-r-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
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
  );
}

// Mobile dropdown for small screens
export function AdminMobileNav({ active, onChange }: AdminSidebarProps) {
  return (
    <div className="md:hidden border-b border-border bg-card px-4 py-2">
      <select
        value={active}
        onChange={(e) => onChange(e.target.value as AdminSection)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        {sidebarGroups.map((group) =>
          group.items.map((item) => (
            <option key={item.key} value={item.key}>
              {group.label} › {item.label}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
