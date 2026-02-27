import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Clock, Key, HelpCircle, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const TIMEOUT_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 25, label: '25 minutes' },
  { value: 30, label: '30 minutes' },
];

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What city were you born in?",
  "What was the name of your first school?",
  "What is the name of your childhood best friend?",
  "What was your childhood nickname?",
  "What street did you grow up on?",
  "What was the make of your first car?",
];

export default function SecuritySettings({ onTimeoutChange }: { onTimeoutChange?: (minutes: number) => void }) {
  const { user } = useAuth();
  const { hasFeature, loading: featureLoading } = useFeatureAccess();

  // Global 2FA check
  const [twoFaGlobalEnabled, setTwoFaGlobalEnabled] = useState(true);

  // Session timeout
  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const [isSavingTimeout, setIsSavingTimeout] = useState(false);

  // 2FA settings
  const [twoFaEnabled, setTwoFaEnabled] = useState(true);
  const [isSaving2FA, setIsSaving2FA] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  // 2FA / OTP password change
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Security questions
  const [q1, setQ1] = useState('');
  const [a1, setA1] = useState('');
  const [q2, setQ2] = useState('');
  const [a2, setA2] = useState('');
  const [q3, setQ3] = useState('');
  const [a3, setA3] = useState('');
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);

  useEffect(() => {
    if (!user) return;
    const identities = user.identities || [];
    setIsGoogleUser(identities.some(i => i.provider === 'google') && identities.length === 1);

    // Fetch global 2FA config
    supabase
      .from('subscription_config')
      .select('config_value')
      .eq('config_key', 'TWO_FA_GLOBAL_ENABLED')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTwoFaGlobalEnabled((data as any).config_value === 'true');
      });

    supabase
      .from('user_security_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTimeoutMinutes(data.session_timeout_minutes ?? 30);
          setTwoFaEnabled(data.two_fa_enabled ?? true);
          setQ1(data.security_question_1 || '');
          setA1(data.security_question_1 ? '••••••••' : '');
          setQ2(data.security_question_2 || '');
          setA2(data.security_question_2 ? '••••••••' : '');
          setQ3(data.security_question_3 || '');
          setA3(data.security_question_3 ? '••••••••' : '');
        }
      });
  }, [user]);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCountdown]);

  const handleSaveTimeout = async () => {
    if (!user) return;
    setIsSavingTimeout(true);
    try {
      const { error } = await supabase
        .from('user_security_settings')
        .upsert({ user_id: user.id, session_timeout_minutes: timeoutMinutes } as any, { onConflict: 'user_id' });
      if (error) throw error;
      onTimeoutChange?.(timeoutMinutes);
      toast.success('Session timeout updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update timeout');
    } finally {
      setIsSavingTimeout(false);
    }
  };

  const handleSave2FA = async () => {
    if (!user) return;
    setIsSaving2FA(true);
    try {
      const { error } = await supabase
        .from('user_security_settings')
        .upsert({
          user_id: user.id,
          two_fa_enabled: twoFaEnabled,
          two_fa_method: 'email',
          two_fa_phone_number: null,
        } as any, { onConflict: 'user_id' });
      if (error) throw error;
      if (!twoFaEnabled) {
        sessionStorage.setItem('2fa_verified', 'true');
      }
      toast.success('Two-factor authentication settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save 2FA settings');
    } finally {
      setIsSaving2FA(false);
    }
  };

  const handleSendOtpForPasswordChange = async () => {
    if (!user) return;
    setIsSendingOtp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: user.email, user_id: user.id, otp_type: 'password_change' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success('Verification code sent to your email');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!otpCode || otpCode.length !== 6) { toast.error('Please enter your 6-digit verification code'); return; }

    setIsChangingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ user_id: user.id, otp_code: otpCode, otp_type: 'password_change' }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully');
      setNewPassword(''); setConfirmPassword(''); setOtpCode(''); setOtpSent(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveSecurityQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!q1 || !a1 || !q2 || !a2 || !q3 || !a3) { toast.error('Please fill in all 3 security questions and answers'); return; }
    if (a1 === '••••••••' || a2 === '••••••••' || a3 === '••••••••') { toast.error('Please enter actual answers'); return; }
    setIsSavingQuestions(true);
    try {
      const { error } = await supabase
        .from('user_security_settings')
        .upsert({
          user_id: user.id,
          security_question_1: q1, security_answer_1: a1.toLowerCase().trim(),
          security_question_2: q2, security_answer_2: a2.toLowerCase().trim(),
          security_question_3: q3, security_answer_3: a3.toLowerCase().trim(),
        }, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('Security questions saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const usedQuestions = [q1, q2, q3].filter(Boolean);
  const availableFor = (current: string) =>
    SECURITY_QUESTIONS.filter(q => q === current || !usedQuestions.includes(q));

  return (
    <div className="space-y-8">

      {/* Session Timeout */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Clock className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Session Timeout</h3>
            <p className="text-xs text-muted-foreground">Auto sign-out after inactivity</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeoutMinutes}
            onChange={e => setTimeoutMinutes(Number(e.target.value))}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TIMEOUT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button onClick={handleSaveTimeout} disabled={isSavingTimeout} size="sm">
            {isSavingTimeout ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A warning will appear 2 minutes before you are signed out.
        </p>
      </section>

      {/* Two-Factor Authentication - only show if globally enabled AND user's plan has TWO_FA feature */}
      {twoFaGlobalEnabled && (hasFeature('TWO_FA') || featureLoading) && (
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Two-Factor Authentication</h3>
              <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Enable 2FA</p>
                <p className="text-xs text-muted-foreground">Require a verification code when signing in</p>
              </div>
              <Switch checked={twoFaEnabled} onCheckedChange={setTwoFaEnabled} />
            </div>

            {twoFaEnabled && (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/30 p-3">
                <Mail className="inline h-3 w-3 mr-1" />
                Verification codes will be sent to <strong>{user?.email}</strong>
              </p>
            )}

            {!twoFaEnabled && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-xs text-destructive">
                  ⚠️ Disabling 2FA reduces your account security. We recommend keeping it enabled.
                </p>
              </div>
            )}

            <Button onClick={handleSave2FA} disabled={isSaving2FA} className="w-full">
              {isSaving2FA ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save 2FA Settings'}
            </Button>
          </div>
        </section>
      )}

      {/* Change Password */}
      {!isGoogleUser && (
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Change Password</h3>
              <p className="text-xs text-muted-foreground">Requires email verification</p>
            </div>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showNew ? 'text' : 'password'} placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={isChangingPassword} />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <div className="relative">
                <Input type={showConfirm ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isChangingPassword} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                To confirm your identity, we'll send a verification code to <strong>{user?.email}</strong>.
              </p>
              {!otpSent ? (
                <Button type="button" variant="outline" size="sm" onClick={handleSendOtpForPasswordChange} disabled={isSendingOtp || !newPassword || !confirmPassword}>
                  {isSendingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Verification Code'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit code" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="text-center text-lg tracking-widest font-mono" disabled={isChangingPassword} />
                  <Button type="button" variant="ghost" size="sm" disabled={otpCountdown > 0 || isSendingOtp} onClick={handleSendOtpForPasswordChange}>
                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend Code'}
                  </Button>
                </div>
              )}
            </div>
            <Button type="submit" disabled={isChangingPassword || !otpSent || otpCode.length !== 6} className="w-full">
              {isChangingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Update Password'}
            </Button>
          </form>
        </section>
      )}

      {isGoogleUser && (
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Key className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Password</h3>
              <p className="text-sm text-muted-foreground">
                Your account uses Google Sign-In — password management is handled by Google.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Security Questions */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <HelpCircle className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Security Questions</h3>
            <p className="text-xs text-muted-foreground">Used for account recovery — answers are case-insensitive</p>
          </div>
        </div>
        <form onSubmit={handleSaveSecurityQuestions} className="space-y-5">
          {[
            { q: q1, setQ: setQ1, a: a1, setA: setA1, label: 'Question 1' },
            { q: q2, setQ: setQ2, a: a2, setA: setA2, label: 'Question 2' },
            { q: q3, setQ: setQ3, a: a3, setA: setA3, label: 'Question 3' },
          ].map(({ q, setQ, a, setA, label }) => (
            <div key={label} className="space-y-2">
              <Label>{label}</Label>
              <select value={q} onChange={e => setQ(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">— Select a question —</option>
                {availableFor(q).map(sq => (
                  <option key={sq} value={sq}>{sq}</option>
                ))}
              </select>
              <Input type="text" placeholder="Your answer" value={a} onFocus={() => { if (a === '••••••••') setA(''); }} onChange={e => setA(e.target.value)} disabled={!q} />
            </div>
          ))}
          <Button type="submit" disabled={isSavingQuestions} className="w-full">
            {isSavingQuestions ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Security Questions'}
          </Button>
        </form>
      </section>
    </div>
  );
}
