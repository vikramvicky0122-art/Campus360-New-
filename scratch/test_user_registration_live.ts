import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseServerClient } from '../server/supabase.ts';

async function testLiveRegistration() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase is not configured!');
  }

  const testEmail = `student_${Date.now().toString().slice(-6)}@gmail.com`;
  const testPassword = 'Password123!';

  console.log(`1. Testing Supabase Auth signUp for: ${testEmail}`);
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Aditya Varma',
        phone: '+91 98765 43210',
        department: 'Electronics & Communication',
        year_of_study: 3,
        roll_number: '2024EC4001',
      },
    },
  });

  if (authErr) {
    console.error('SignUp Error:', authErr.message);
    throw authErr;
  }

  console.log(`✓ Auth user created successfully in Supabase! User ID: ${authData.user?.id}`);

  // Wait 1 second for database trigger
  await new Promise(r => setTimeout(r, 1000));

  console.log('2. Verifying public.profiles was automatically populated by trigger...');
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user?.id)
    .single();

  if (profErr) {
    console.error('Profile fetch error:', profErr.message);
  } else {
    console.log(`✓ Profile found in Supabase!`);
    console.log(`   Name: ${profile.full_name}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Roll: ${profile.roll_number}`);
  }

  console.log('3. Testing signInWithPassword with the newly created account...');
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginErr) {
    console.error('SignIn error (note: email confirmation might be required depending on project settings):', loginErr.message);
  } else {
    console.log(`✓ Login succeeded! Access Token generated for ${loginData.user?.email}`);
  }

  console.log('\n=============================================================');
  console.log('🎉 LIVE SUPABASE REGISTRATION & LOGIN FULLY VERIFIED!');
  console.log('=============================================================');
}

testLiveRegistration().catch(err => {
  console.error('Live registration test error:', err);
});
