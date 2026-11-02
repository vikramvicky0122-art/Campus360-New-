// Vercel Serverless Function: /api/register
// Uses Supabase Admin REST API directly (no SDK dependency issues).
// email_confirm: true → no email is ever sent → no free-tier rate limit.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[register] Missing env vars:', { supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey });
    return res.status(500).json({
      error: 'Server misconfiguration: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in Vercel environment variables.',
    });
  }

  const { email, password, fullName, rollNumber, phone, department, yearOfStudy, institutionId } = req.body || {};

  if (!email || !password || !fullName || !rollNumber || !institutionId) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  if ((password || '').length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const cleanRoll = (rollNumber || '').trim().toUpperCase();

  const authHeaders = {
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
  };

  try {
    // 1. Check if email already exists
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, { headers: authHeaders });
    if (listRes.ok) {
      const listData = await listRes.json();
      const emailExists = (listData.users || []).some((u) => u.email?.toLowerCase() === trimmedEmail);
      if (emailExists) {
        return res.status(409).json({ error: 'This email address is already registered. Please sign in instead.' });
      }
    }

    // 2. Check if roll number exists in this institution
    const profilesRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?roll_number=eq.${encodeURIComponent(cleanRoll)}&institution_id=eq.${encodeURIComponent(institutionId)}&select=id`,
      { headers: { ...authHeaders, 'Prefer': 'return=representation' } }
    );
    if (profilesRes.ok) {
      const profiles = await profilesRes.json();
      if (Array.isArray(profiles) && profiles.length > 0) {
        return res.status(409).json({ error: 'This roll number is already registered in your institution.' });
      }
    }

    // 3. Create user without sending any email (email_confirm: true = skip confirmation email)
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
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
      }),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      const errMsg = createData.message || createData.msg || createData.error_description || JSON.stringify(createData);
      console.error('[register] createUser failed:', createRes.status, errMsg);
      if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('duplicate')) {
        return res.status(409).json({ error: 'This email is already registered. Please sign in instead.' });
      }
      return res.status(400).json({ error: errMsg });
    }

    console.log('[register] User created:', createData.id, trimmedEmail);
    return res.status(200).json({
      success: true,
      message: 'Registration submitted. Pending campus admin approval.',
      userId: createData.id,
    });

  } catch (err) {
    console.error('[register] Unexpected error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
