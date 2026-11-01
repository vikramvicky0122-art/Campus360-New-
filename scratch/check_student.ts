import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseServerClient } from '../server/supabase.ts';

async function checkStudent() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Profiles in Supabase:');
  profiles?.forEach(p => console.log(`- ${p.email} | Role: ${p.role} | Verified: ${p.is_verified} | Status: ${p.verification_status}`));
}

checkStudent();

