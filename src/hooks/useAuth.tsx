import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000;       // warn 2 minutes before logout
const WARNING_TOAST_ID = 'inactivity-warning';
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'pointerdown'];
const LAST_ACTIVE_KEY = 'taxapp_last_active';

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

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<User | null>(null);

  // Keep userRef in sync for use inside event listeners
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile | null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return ['user' as AppRole];
      }
      return (data?.map(r => r.role as AppRole)) || ['user' as AppRole];
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return ['user' as AppRole];
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const [profileData, roles] = await Promise.all([
        fetchProfile(user.id),
        fetchUserRoles(user.id),
      ]);
      setProfile(profileData);
      setUserRoles(roles);
    }
  };

  // ─── Inactivity logout ───────────────────────────────────────────────────
  const performSignOut = useCallback(async () => {
    localStorage.removeItem(LAST_ACTIVE_KEY);
    if (inactivityTimer.current) { clearTimeout(inactivityTimer.current); inactivityTimer.current = null; }
    if (warningTimer.current) { clearTimeout(warningTimer.current); warningTimer.current = null; }
    toast.dismiss(WARNING_TOAST_ID);
    await supabase.auth.signOut({ scope: 'local' });
    setProfile(null);
    setUserRoles([]);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (!userRef.current) return;

    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());

    // Clear existing timers and dismiss any open warning
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    toast.dismiss(WARNING_TOAST_ID);

    // Warning toast fires 2 minutes before logout
    warningTimer.current = setTimeout(() => {
      if (!userRef.current) return;
      toast.warning('You will be logged out soon', {
        id: WARNING_TOAST_ID,
        description: 'You\'ve been inactive for 28 minutes. You\'ll be automatically signed out in 2 minutes.',
        duration: WARNING_BEFORE_MS,
        action: {
          label: 'Stay logged in',
          onClick: () => resetInactivityTimer(),
        },
      });
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Logout fires after full timeout
    inactivityTimer.current = setTimeout(() => {
      if (userRef.current) {
        toast.dismiss(WARNING_TOAST_ID);
        toast.info('You have been signed out due to inactivity.');
        console.info('[Auth] Inactivity timeout — signing out');
        performSignOut();
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [performSignOut]);

  const startActivityTracking = useCallback(() => {
    ACTIVITY_EVENTS.forEach(event =>
      window.addEventListener(event, resetInactivityTimer, { passive: true })
    );
    // Start the timer on first call
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const stopActivityTracking = useCallback(() => {
    ACTIVITY_EVENTS.forEach(event =>
      window.removeEventListener(event, resetInactivityTimer)
    );
    if (inactivityTimer.current) { clearTimeout(inactivityTimer.current); inactivityTimer.current = null; }
    if (warningTimer.current) { clearTimeout(warningTimer.current); warningTimer.current = null; }
    toast.dismiss(WARNING_TOAST_ID);
  }, [resetInactivityTimer]);

  // Check inactivity when the tab regains focus (user was away in another tab)
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && userRef.current) {
      const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);
      if (lastActive && Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
        console.info('[Auth] Tab refocused after inactivity — signing out');
        performSignOut();
      } else {
        resetInactivityTimer();
      }
    }
  }, [performSignOut, resetInactivityTimer]);

  // ─── Auth initialization ─────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    let initialLoadDone = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          if (initialLoadDone) setLoading(true);
          setTimeout(() => {
            Promise.all([
              fetchProfile(session.user.id),
              fetchUserRoles(session.user.id),
            ]).then(([profileData, roles]) => {
              if (!isMounted) return;
              setProfile(profileData);
              setUserRoles(roles);
              setLoading(false);
            });
          }, 0);

          // Start inactivity tracking when user is authenticated
          startActivityTracking();
        } else {
          setProfile(null);
          setUserRoles([]);
          if (initialLoadDone) setLoading(false);
          // Stop inactivity tracking when signed out
          stopActivityTracking();
          localStorage.removeItem(LAST_ACTIVE_KEY);
        }
      }
    );

    // INITIAL load — check inactivity from a previous session before restoring
    const initializeAuth = async () => {
      try {
        // Check if user was inactive before this page load
        const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);
        if (lastActive && Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
          console.info('[Auth] Session expired due to inactivity — clearing');
          localStorage.removeItem(LAST_ACTIVE_KEY);
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const [profileData, roles] = await Promise.all([
            fetchProfile(session.user.id),
            fetchUserRoles(session.user.id),
          ]);
          if (!isMounted) return;
          setProfile(profileData);
          setUserRoles(roles);
          // Stamp activity on page load for existing sessions
          localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          initialLoadDone = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Visibility change handler for cross-tab inactivity detection
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      stopActivityTracking();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startActivityTracking, stopActivityTracking, handleVisibilityChange]);

  // ─── Auth methods ────────────────────────────────────────────────────────
  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    try {
      const { lovable } = await import('@/integrations/lovable/index');
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      return { error: result.error ? (result.error as Error) : null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await performSignOut();
  };

  const isAnyAdmin = userRoles.some(r => ['super_admin', 'employee_admin', 'user_admin'].includes(r));
  const isSuperAdmin = userRoles.includes('super_admin');

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      userRoles,
      isAnyAdmin,
      isSuperAdmin,
      signUp,
      signIn,
      signInWithGoogle,
      resetPassword,
      signOut,
      refreshProfile
    }}>
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
