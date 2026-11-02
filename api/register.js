// Vercel Serverless Function: /api/register
// Runs server-side with SUPABASE_SERVICE_ROLE_KEY so:
//   1. No email is sent (email_confirm: true) → avoids free-tier email rate limit
//   2. Service role key never exposed to the browser
//   3. No CORS issues because same Vercel origin serves the SPA

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    email,
    password,
    fullName,
    rollNumber,
    phone,
    department,
    yearOfStudy,
    institutionId,
  } = req.body || {};

  // Validation
  if (!email || !password || !fullName || !rollNumber || !institutionId) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const trimmedEmail = email.trim().toLowerCase();
  const cleanRoll = rollNumber.trim().toUpperCase();

  // Check duplicate email
  const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailExists = existingUsers?.users?.some(
    (u) => u.email?.toLowerCase() === trimmedEmail
  );
  if (emailExists) {
    return res.status(409).json({ error: 'This email address is already registered. Please sign in instead.' });
  }

  // Check duplicate roll number in this institution
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('roll_number', cleanRoll)
    .eq('institution_id', institutionId)
    .maybeSingle();
  if (existing) {
    return res.status(409).json({ error: 'This roll number is already registered in your institution.' });
  }

  // Create user WITHOUT sending any email (email_confirm: true = skip email)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: trimmedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      roll_number: cleanRoll,
      phone: phone || '',
      department: department || 'General',
      year_of_study: yearOfStudy || 1,
      institution_id: institutionId,
    },
  });

  if (authError) {
    const msg = authError.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('duplicate')) {
      return res.status(409).json({ error: 'This email is already registered.' });
    }
    return res.status(400).json({ error: authError.message });
  }

  return res.status(200).json({
    success: true,
    message: 'Registration submitted. Pending campus admin approval.',
    userId: authData.user.id,
  });
};
