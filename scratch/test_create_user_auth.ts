import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseServerClient } from '../server/supabase.ts';

async function testCreate() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error('Supabase not configured');
    return;
  }

  const testEmail = `test_auth_${Date.now().toString().slice(-5)}@gmail.com`;
  console.log('Testing admin.createUser for:', testEmail);

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Student',
        roll_number: '2024TEST',
      },
    });

    if (error) {
      console.error('admin.createUser Error:', error);
    } else {
      console.log('✓ admin.createUser SUCCESS! Created in Supabase Auth -> Users:');
      console.log('  ID:', data.user.id);
      console.log('  Email:', data.user.email);
    }
  } catch (err: any) {
    console.error('Exception calling admin.createUser:', err.message);
  }
}

testCreate();

