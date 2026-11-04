// Vercel Serverless Function: /api/register (ES Module)
// Uses Supabase Admin REST API with service role key.
// email_confirm: true skips sending confirmation emails (no rate limits).

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[register] Missing Supabase env variables');
    return res.status(500).json({
      error: 'Server misconfiguration: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (_) {
      body = {};
    }
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
  } = body || {};

  if (!email || !password || !fullName || !rollNumber) {
    return res.status(400).json({ error: 'Missing required registration fields.' });
  }
  if ((password || '').length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const cleanRoll = rollNumber.trim().toUpperCase();
  const validInstitutionId = institutionId || '00000000-0000-0000-0000-000000000001';

  const authHeaders = {
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
  };

  try {
    // 1. Check if email already exists in Supabase Auth
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: authHeaders,
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const emailExists = (listData.users || []).some(
        (u) => u.email?.toLowerCase() === trimmedEmail
      );
      if (emailExists) {
        return res.status(409).json({
          error: 'This email address is already registered. Please sign in instead.',
        });
      }
    }

    // 2. Check if roll number or email already exists in profiles
    const [profilesRollRes, profilesEmailRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/profiles?roll_number=eq.${encodeURIComponent(cleanRoll)}&select=id`,
        { headers: { ...authHeaders, 'Prefer': 'return=representation' } }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(trimmedEmail)}&select=id`,
        { headers: { ...authHeaders, 'Prefer': 'return=representation' } }
      ),
    ]);

    if (profilesRollRes.ok) {
      const rollProfiles = await profilesRollRes.json();
      if (Array.isArray(rollProfiles) && rollProfiles.length > 0) {
        return res.status(409).json({
          error: `Roll number '${cleanRoll}' is already registered. Please sign in or contact admin.`,
        });
      }
    }

    if (profilesEmailRes.ok) {
      const emailProfiles = await profilesEmailRes.json();
      if (Array.isArray(emailProfiles) && emailProfiles.length > 0) {
        return res.status(409).json({
          error: 'This email is already registered. Please sign in instead.',
        });
      }
    }

    // 3. Create user in Supabase with email_confirm: true (bypasses sending email)
    let createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
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
          year_of_study: Number(yearOfStudy) || 1,
          institution_id: validInstitutionId,
        },
      }),
    });

    let createData = await createRes.json();

    // If trigger failed inside Postgres with "Database error creating new user",
    // retry with minimal payload so the user is created, then insert profile manually
    if (
      !createRes.ok &&
      (createData.msg?.includes('Database error') ||
        createData.message?.includes('Database error') ||
        createData.error_description?.includes('Database error'))
    ) {
      console.warn('[register] Trigger error on admin/users, retrying with minimal payload...');
      createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          email_confirm: true,
        }),
      });
      createData = await createRes.json();
    }

    if (!createRes.ok) {
      const errMsg =
        createData.message ||
        createData.msg ||
        createData.error_description ||
        JSON.stringify(createData);
      if (
        errMsg.toLowerCase().includes('already registered') ||
        errMsg.toLowerCase().includes('duplicate')
      ) {
        return res.status(409).json({
          error: 'This email is already registered. Please sign in instead.',
        });
      }
      if (errMsg.toLowerCase().includes('database error')) {
        return res.status(400).json({
          error: 'This email or roll number is already associated with an account. Please sign in.',
        });
      }
      return res.status(400).json({ error: errMsg });
    }

    // 4. Ensure profile is upserted into public.profiles
    const newUserId = createData.id;
    try {
      await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          id: newUserId,
          email: trimmedEmail,
          full_name: fullName,
          phone: phone || '',
          department: department || 'General',
          year_of_study: Number(yearOfStudy) || 1,
          roll_number: cleanRoll,
          institution_id: validInstitutionId,
          role: 'user',
          is_verified: false,
          verification_status: 'PENDING',
        }),
      });
    } catch (profErr) {
      console.warn('[register] manual profile upsert warning:', profErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Registration submitted. Pending campus admin approval.',
      userId: newUserId,
    });
  } catch (err) {
    console.error('[register] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
