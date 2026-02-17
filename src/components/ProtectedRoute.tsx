import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, userRoles } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If profile is null after loading, redirect to profile setup instead of hanging
  if (!profile) {
    return <Navigate to="/profile-setup" replace />;
  }

  // For admin routes, require any admin-level role
  if (requiredRole === 'admin') {
    const isAdmin = userRoles.some(r => ['super_admin', 'employee_admin', 'user_admin'].includes(r));
    if (!isAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
