import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Default 30 min — overridden per-user from DB on login
let INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 2 * 60 * 1000;       // warn 2 min before
const WARNING_TOAST_ID = 'inactivity-warning';
const LAST_ACTIVE_KEY = 'taxapp_last_active';
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'pointerdown'] as const;

type AppRole = 'user' | 'admin' | 'super_admin' | 'employee_admin' | 'user_admin';

interface Profile {
  id: string;
  email: string;
  role: AppRole;
  first_name: string | null;
  last_name: string | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  userRoles: AppRole[];
  isAnyAdmin: boolean;
  isSuperAdmin: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Stable refs so inactivity callbacks never need to be re-created
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoggedIn = useRef(false); // mirrors whether user is set, used inside closures

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) { console.error('Error fetching profile:', error); return null; }
      return data as Profile | null;
    } catch (e) { console.error('Error fetching profile:', e); return null; }
  };

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (error) { console.error('Error fetching user roles:', error); return ['user' as AppRole]; }
      return (data?.map(r => r.role as AppRole)) || ['user' as AppRole];
    } catch (e) { console.error('Error fetching user roles:', e); return ['user' as AppRole]; }
  };

  // Load user's custom session timeout from security settings
  const loadUserTimeout = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_security_settings')
        .select('session_timeout_minutes')
        .eq('user_id', userId)
        .maybeSingle();
      if (data?.session_timeout_minutes) {
        INACTIVITY_TIMEOUT_MS = data.session_timeout_minutes * 60 * 1000;
      }
    } catch (e) { /* use default */ }
  };

  const refreshProfile = async () => {
    if (!isLoggedIn.current) return;
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) return;
    const [profileData, roles] = await Promise.all([fetchProfile(currentUser.id), fetchUserRoles(currentUser.id)]);
    setProfile(profileData);
    setUserRoles(roles);
  };

  // ── Inactivity helpers (defined once, stable refs) ────────────────────────
  const clearTimers = useCallback(() => {
    if (inactivityTimer.current) { clearTimeout(inactivityTimer.current); inactivityTimer.current = null; }
    if (warningTimer.current) { clearTimeout(warningTimer.current); warningTimer.current = null; }
    toast.dismiss(WARNING_TOAST_ID);
  }, []);

  const scheduleTimers = useCallback(() => {
    if (!isLoggedIn.current) return;

    clearTimers();
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());

    // Warning toast (2 min before timeout)
    const warningMs = INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS;
    warningTimer.current = setTimeout(() => {
      if (!isLoggedIn.current) return;
      toast.warning('You will be logged out soon', {
        id: WARNING_TOAST_ID,
        description: `You've been inactive. You'll be signed out in 2 minutes.`,
        duration: WARNING_BEFORE_MS,
        action: {
          label: 'Stay logged in',
          onClick: () => scheduleTimers(),
        },
      });
    }, warningMs > 0 ? warningMs : 1000);

    // Auto-logout
    inactivityTimer.current = setTimeout(() => {
      if (!isLoggedIn.current) return;
      toast.dismiss(WARNING_TOAST_ID);
      toast.info('You have been signed out due to inactivity.');
      sessionStorage.removeItem('2fa_verified');
      supabase.auth.signOut({ scope: 'local' });
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearTimers]);

  // ── Auth methods ──────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    clearTimers();
    localStorage.removeItem(LAST_ACTIVE_KEY);
    sessionStorage.removeItem('2fa_verified');
    await supabase.auth.signOut({ scope: 'local' });
    // state cleared via onAuthStateChange
  }, [clearTimers]);

  // ── Single auth effect — stable deps only ─────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    let initialLoadDone = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      isLoggedIn.current = !!session?.user;

      if (session?.user) {
        if (initialLoadDone) setLoading(true);
        setTimeout(() => {
          Promise.all([
            fetchProfile(session.user.id),
            fetchUserRoles(session.user.id),
            loadUserTimeout(session.user.id),
          ]).then(([p, r]) => {
            if (!isMounted) return;
            setProfile(p);
            setUserRoles(r);
            setLoading(false);
          });
        }, 0);
        scheduleTimers();
        ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, scheduleTimers, { passive: true }));
      } else {
        setProfile(null);
        setUserRoles([]);
        if (initialLoadDone) setLoading(false);
        clearTimers();
        localStorage.removeItem(LAST_ACTIVE_KEY);
        sessionStorage.removeItem('2fa_verified');
        ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, scheduleTimers));
      }
    });

    // Tab visibility: check inactivity when user switches back
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isLoggedIn.current) {
        const last = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);
        if (last && Date.now() - last > INACTIVITY_TIMEOUT_MS) {
          toast.dismiss(WARNING_TOAST_ID);
          toast.info('You have been signed out due to inactivity.');
          sessionStorage.removeItem('2fa_verified');
          supabase.auth.signOut({ scope: 'local' });
        } else {
          scheduleTimers();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Initial load
    const init = async () => {
      try {
        // Check inactivity from a prior session
        const last = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);
        if (last && Date.now() - last > INACTIVITY_TIMEOUT_MS) {
          localStorage.removeItem(LAST_ACTIVE_KEY);
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        isLoggedIn.current = !!session?.user;

        if (session?.user) {
          const [p, r] = await Promise.all([
            fetchProfile(session.user.id),
            fetchUserRoles(session.user.id),
            loadUserTimeout(session.user.id),
          ]) as any;
          if (!isMounted) return;
          setProfile(p);
          setUserRoles(r);
          localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
        }
      } catch (e) {
        console.error('Error initializing auth:', e);
      } finally {
        if (isMounted) {
          initialLoadDone = true;
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimers();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, scheduleTimers));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [scheduleTimers, clearTimers]); // scheduleTimers/clearTimers are stable useCallback with no changing deps

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: 'https://taxbebo.com/' } });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    try {
      // Bypass auth-bridge to prevent redirects through lovable.app domains
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          skipBrowserRedirect: true,
        },
      });
      if (error) return { error: error as Error };
      if (data?.url) {
        const oauthUrl = new URL(data.url);
        if (oauthUrl.protocol !== 'https:') {
          return { error: new Error('Invalid OAuth redirect URL') };
        }
        window.location.href = data.url;
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://taxbebo.com/reset-password' });
    return { error: error as Error | null };
  };

  const isAnyAdmin = userRoles.some(r => ['super_admin', 'employee_admin', 'user_admin'].includes(r));
  const isSuperAdmin = userRoles.includes('super_admin');

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, userRoles, isAnyAdmin, isSuperAdmin, signUp, signIn, signInWithGoogle, resetPassword, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
