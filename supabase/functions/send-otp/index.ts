import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { email, user_id, otp_type = 'login' } = await req.json();

    if (!email || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing email or user_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Invalidate previous unused OTPs for this user/type
    await supabaseAdmin
      .from('user_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('otp_type', otp_type)
      .is('used_at', null);

    // Insert new OTP
    const { error: insertError } = await supabaseAdmin.from('user_otps').insert({
      user_id,
      email,
      otp_code: otpCode,
      otp_type,
      expires_at: expiresAt,
    });

    if (insertError) throw insertError;

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

    const typeLabel = otp_type === 'login' ? 'sign-in' : otp_type === 'password_change' ? 'password change' : 'verification';
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'WorTaF Security <security@wortaf.com>',
        to: [email],
        subject: `Your WorTaF ${typeLabel} verification code`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a1a2e; margin-bottom: 8px;">Verification Code</h2>
            <p style="color: #666; margin-bottom: 24px;">Use this code to complete your ${typeLabel}. It expires in 10 minutes.</p>
            <div style="background: #f4f4f8; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e;">${otpCode}</span>
            </div>
            <p style="color: #999; font-size: 12px;">If you did not request this code, please ignore this email and ensure your account is secure.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      throw new Error(`Failed to send email: ${errBody}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('send-otp error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
