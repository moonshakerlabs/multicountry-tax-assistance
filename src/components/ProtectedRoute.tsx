import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, userRoles } = useAuth();
  const [twoFaChecked, setTwoFaChecked] = useState(false);
  const [twoFaRequired, setTwoFaRequired] = useState(true);

  useEffect(() => {
    if (!user) { setTwoFaChecked(true); return; }

    // If already verified this session, skip DB check
    if (sessionStorage.getItem('2fa_verified') === 'true') {
      setTwoFaChecked(true);
      setTwoFaRequired(false);
      return;
    }

    // Check if 2FA is enabled for this user
    supabase
      .from('user_security_settings')
      .select('two_fa_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const enabled = data?.two_fa_enabled ?? true; // default enabled for new users
        if (!enabled) {
          sessionStorage.setItem('2fa_verified', 'true');
          setTwoFaRequired(false);
        } else {
          setTwoFaRequired(true);
        }
        setTwoFaChecked(true);
      });
  }, [user]);

  if (loading || !twoFaChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Enforce 2FA if enabled and not yet verified
  if (twoFaRequired) {
    const twoFaVerified = sessionStorage.getItem('2fa_verified') === 'true';
    if (!twoFaVerified) {
      return <Navigate to="/2fa-verify" replace />;
    }
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
