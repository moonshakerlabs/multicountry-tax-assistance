import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { APP_NAME } from '@/lib/appConfig';
import './Auth.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated', description: 'Your password has been reset successfully.' });
      navigate('/dashboard', { replace: true });
    }
  };

  if (!isRecovery) {
    return (
      <div className="auth-container">
        <div className="auth-content">
          <div className="auth-card">
            <h1 className="auth-title">Invalid Reset Link</h1>
            <p className="auth-subtitle">This link is invalid or has expired.</p>
            <Button asChild className="auth-submit-btn">
              <Link to="/auth">Back to Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="auth-logo">
          <Link to="/" className="auth-logo-link">
            <div className="auth-logo-icon" />
            <span className="auth-logo-text">{APP_NAME}</span>
          </Link>
        </div>
        <div className="auth-card">
          <h1 className="auth-title">Reset Your Password</h1>
          <p className="auth-subtitle">Enter your new password below.</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="auth-field">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Reset Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
