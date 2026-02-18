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

  // Enforce 2FA: if not verified in this session, redirect to verify page
  const twoFaVerified = sessionStorage.getItem('2fa_verified') === 'true';
  if (!twoFaVerified) {
    return <Navigate to="/2fa-verify" replace />;
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
