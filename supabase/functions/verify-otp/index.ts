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

    const { user_id, otp_code, otp_type = 'login' } = await req.json();

    if (!user_id || !otp_code) {
      return new Response(JSON.stringify({ error: 'Missing user_id or otp_code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find the most recent unused OTP for this user/type
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from('user_otps')
      .select('*')
      .eq('user_id', user_id)
      .eq('otp_type', otp_type)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: 'OTP expired or not found. Please request a new code.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (otpRecord.otp_code !== otp_code.trim()) {
      return new Response(JSON.stringify({ error: 'Invalid verification code. Please try again.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mark OTP as used
    await supabaseAdmin
      .from('user_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    // If login OTP, mark 2FA as verified in security settings
    if (otp_type === 'login') {
      await supabaseAdmin
        .from('user_security_settings')
        .upsert({ user_id, two_fa_verified: true }, { onConflict: 'user_id' });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('verify-otp error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
