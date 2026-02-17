import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    let isMounted = true;

    // Listener for ONGOING auth changes (does NOT control loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
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
        } else {
          setProfile(null);
          setUserRoles([]);
          setLoading(false);
        }
      }
    );

    // INITIAL load — fetch profile BEFORE setting loading to false
    const initializeAuth = async () => {
      try {
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
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
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
    await supabase.auth.signOut();
    setProfile(null);
    setUserRoles([]);
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
