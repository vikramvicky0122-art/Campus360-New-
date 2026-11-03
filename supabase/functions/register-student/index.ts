import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const {
      email,
      password,
      fullName,
      rollNumber,
      phone,
      department,
      yearOfStudy,
      institutionId,
    } = body;

    // Validate required fields
    if (!email || !password || !fullName || !rollNumber || !institutionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, fullName, rollNumber, institutionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key to bypass email confirmation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'This email address is already registered. Please sign in instead.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if roll number already exists for this institution
    const cleanRollNumber = rollNumber.trim().toUpperCase();
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('roll_number', cleanRollNumber)
      .eq('institution_id', institutionId)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: 'This roll number is already registered. Please check your details or contact admin.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user WITHOUT email confirmation (email_confirm: true skips sending the email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Auto-confirm email — admin approval is the gate, not email
      user_metadata: {
        full_name: fullName,
        roll_number: cleanRollNumber,
        phone: phone || '',
        department: department || 'General',
        year_of_study: yearOfStudy || 1,
        institution_id: institutionId,
      },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('duplicate') || msg.includes('unique')) {
        return new Response(
          JSON.stringify({ error: 'This email address is already registered. Please sign in instead.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Registration failed: No user returned from authentication service.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The database trigger (on_auth_user_created) automatically creates the profile row.
    // Return success immediately.
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registration submitted. Pending campus admin approval.',
        userId: authData.user.id,
        email: authData.user.email,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

