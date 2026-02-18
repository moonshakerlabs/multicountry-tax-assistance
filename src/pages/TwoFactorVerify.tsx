import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShieldCheck, Mail, RefreshCw } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function TwoFactorVerify() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate('/auth', { replace: true }); return; }
    sendOtp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendOtp = async () => {
    if (!user) return;
    setIsResending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: user.email, user_id: user.id, otp_type: 'login' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Verification code sent to your email');
      setCountdown(60);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send code');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || otp.length !== 6) return;
    setIsVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ user_id: user.id, otp_code: otp, otp_type: 'login' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Mark 2FA done in session storage so ProtectedRoute knows
      sessionStorage.setItem('2fa_verified', 'true');
      toast.success('Identity verified!');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
      setOtp('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = async () => {
    sessionStorage.removeItem('2fa_verified');
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          {/* Icon */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground">Two-Factor Verification</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the 6-digit code sent to
              </p>
              <p className="flex items-center justify-center gap-1 text-sm font-medium text-foreground">
                <Mail className="h-3.5 w-3.5" />
                {user?.email}
              </p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-[0.5em] font-mono h-14"
              disabled={isVerifying}
              autoComplete="one-time-code"
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isVerifying || otp.length !== 6}
            >
              {isVerifying ? 'Verifying...' : 'Verify & Sign In'}
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              disabled={isResending || countdown > 0}
              onClick={sendOtp}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              {countdown > 0 ? `Resend in ${countdown}s` : isResending ? 'Sending...' : 'Resend Code'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={handleCancel}
            >
              Cancel & Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
