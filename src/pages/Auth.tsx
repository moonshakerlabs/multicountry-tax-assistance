import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import './Auth.css';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type AuthMode = 'signin' | 'signup';

// Check if email is associated with Google provider
async function checkEmailProvider(email: string): Promise<'google' | 'email' | 'unknown'> {
  // We cannot directly check provider without exposing user enumeration
  // Instead, we'll handle this during the login error response
  return 'unknown';
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showGoogleHint, setShowGoogleHint] = useState(false);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  
  const { user, profile, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (user && profile) {
      const redirectPath = profile.role === 'admin' ? '/admin' : '/dashboard';
      navigate(redirectPath, { replace: true });
    }
  }, [user, profile, navigate]);

  // Update mode based on URL params
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'signup') {
      setMode('signup');
    } else if (modeParam === 'signin') {
      setMode('signin');
    }
  }, [searchParams]);

  const validateEmail = () => {
    try {
      emailSchema.parse(email);
      setErrors(prev => ({ ...prev, email: undefined }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, email: error.errors[0].message }));
      }
      return false;
    }
  };

  const validatePassword = () => {
    try {
      passwordSchema.parse(password);
      setErrors(prev => ({ ...prev, password: undefined }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, password: error.errors[0].message }));
      }
      return false;
    }
  };

  const validateForm = () => {
    const emailValid = validateEmail();
    const passwordValid = !isGoogleAccount && validatePassword();
    return emailValid && (isGoogleAccount || passwordValid);
  };

  const handleEmailBlur = async () => {
    if (!validateEmail()) return;
    
    // Reset Google account state
    setIsGoogleAccount(false);
    setShowGoogleHint(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGoogleAccount) {
      // Redirect to Google sign-in
      handleGoogleSignIn();
      return;
    }
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setShowGoogleHint(false);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'An account with this email already exists. Please sign in instead.',
              variant: 'destructive'
            });
            setMode('signin');
          } else {
            toast({
              title: 'Sign up failed',
              description: 'Unable to create account. Please try again.',
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: 'Account created',
            description: 'Welcome! You can now access your dashboard.',
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          // Check if this might be a Google-only account
          // Supabase returns "Invalid login credentials" for both wrong password and no password set
          if (error.message.includes('Invalid login credentials')) {
            // Show Google sign-in hint without confirming if email exists
            setShowGoogleHint(true);
            setIsGoogleAccount(true);
            toast({
              title: 'Sign in method',
              description: "It looks like this account was created using Google Sign-In. Please continue by clicking 'Sign in with Google'.",
              variant: 'default'
            });
          } else {
            toast({
              title: 'Sign in failed',
              description: 'Unable to sign in. Please check your details and try again.',
              variant: 'destructive'
            });
          }
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Unable to sign in. Please check your details and try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: 'Google sign in failed',
        description: 'Unable to sign in. Please check your details and try again.',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    const newMode = mode === 'signin' ? 'signup' : 'signin';
    setMode(newMode);
    setErrors({});
    setShowGoogleHint(false);
    setIsGoogleAccount(false);
    navigate(`/auth?mode=${newMode}`, { replace: true });
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
      {/* Back link & Logo */}
        <div className="auth-back-row">
          <Link to="/" className="auth-back-link">
            ← Back to Home
          </Link>
        </div>
        <div className="auth-logo">
          <Link to="/" className="auth-logo-link">
            <div className="auth-logo-icon" />
            <span className="auth-logo-text">WorTaF</span>
          </Link>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          {/* Mode Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'signin' ? 'auth-tab-active' : ''}`}
              onClick={() => toggleMode()}
              disabled={mode === 'signin'}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'signup' ? 'auth-tab-active' : ''}`}
              onClick={() => toggleMode()}
              disabled={mode === 'signup'}
            >
              Sign Up
            </button>
          </div>

          <h1 className="auth-title">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="auth-subtitle">
            {mode === 'signup' 
              ? 'Start organising your cross-border tax documents' 
              : 'Sign in to continue to your dashboard'}
          </p>

          {/* Google Sign In */}
          <Button 
            variant="outline" 
            className={`auth-google-btn ${showGoogleHint ? 'auth-google-btn-highlighted' : ''}`}
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="auth-google-icon" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
          </Button>

          {showGoogleHint && (
            <div className="auth-google-hint">
              Use the same sign-in method you used during registration.
            </div>
          )}

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <div className="auth-divider-text">
              <span>Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                disabled={isLoading}
                className={errors.email ? 'auth-input-error' : ''}
              />
              {errors.email && (
                <p className="auth-error-text">{errors.email}</p>
              )}
            </div>
            
            {!isGoogleAccount && (
              <div className="auth-field">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isGoogleAccount}
                  className={errors.password ? 'auth-input-error' : ''}
                />
                {errors.password && (
                  <p className="auth-error-text">{errors.password}</p>
                )}
              </div>
            )}
            
            <Button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Please wait...' : (
                isGoogleAccount ? 'Continue with Google' : (mode === 'signup' ? 'Create account' : 'Sign in')
              )}
            </Button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <p className="auth-toggle-text">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="auth-toggle-link"
              disabled={isLoading}
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
