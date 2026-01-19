import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { User, FileText, LogOut } from 'lucide-react';

export default function Dashboard() {
  const { profile, signOut } = useAuth();

  const displayName = profile?.first_name 
    ? profile.first_name 
    : profile?.email?.split('@')[0] || 'User';

  const isProfileComplete = profile?.first_name && profile?.last_name;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container-wide flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary" />
              <span className="text-lg font-semibold text-foreground">TaxAlign</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {profile?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-tight py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome, {displayName}</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your cross-border tax documents in one place.
          </p>
        </div>

        {/* Profile Completion Alert */}
        {!isProfileComplete && (
          <div className="mb-8 rounded-lg border border-accent/30 bg-accent/5 p-4">
            <p className="text-sm text-foreground">
              <strong>Complete your profile to get started.</strong>
              {' '}Add your name and preferences to personalize your experience.
            </p>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card-interactive p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <User className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Edit Profile</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Update your personal information and language preferences.
            </p>
            <Button asChild variant="outline">
              <Link to="/profile">Edit Profile</Link>
            </Button>
          </div>

          <div className="card-elevated p-6 opacity-60">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Upload Documents</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Securely upload and organise your tax documents.
            </p>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
