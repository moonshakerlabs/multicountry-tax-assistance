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

    // Check global 2FA config first, then user settings + plan feature
    const check2FA = async () => {
      // 1. Global toggle
      const { data: globalConfig } = await supabase
        .from('subscription_config')
        .select('config_value')
        .eq('config_key', 'TWO_FA_GLOBAL_ENABLED')
        .maybeSingle();

      if (!globalConfig || (globalConfig as any).config_value !== 'true') {
        sessionStorage.setItem('2fa_verified', 'true');
        setTwoFaRequired(false);
        setTwoFaChecked(true);
        return;
      }

      // 2. Check if user's plan has TWO_FA feature
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('subscription_plan')
        .eq('user_id', user.id)
        .maybeSingle();

      const planKey = (subData as any)?.subscription_plan || 'FREE';

      const { data: featureData } = await supabase
        .from('plan_feature_mapping')
        .select('enabled')
        .eq('plan_key', planKey)
        .eq('feature_key', 'TWO_FA')
        .maybeSingle();

      if (!featureData || !(featureData as any).enabled) {
        sessionStorage.setItem('2fa_verified', 'true');
        setTwoFaRequired(false);
        setTwoFaChecked(true);
        return;
      }

      // 3. Check user's own 2FA setting
      const { data } = await supabase
        .from('user_security_settings')
        .select('two_fa_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      const enabled = data?.two_fa_enabled ?? false;
      if (!enabled) {
        sessionStorage.setItem('2fa_verified', 'true');
        setTwoFaRequired(false);
      } else {
        setTwoFaRequired(true);
      }
      setTwoFaChecked(true);
    };

    check2FA();
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
