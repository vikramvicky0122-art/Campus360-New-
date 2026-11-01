import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseServerClient } from '../server/supabase.ts';

async function checkProfile() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const { data, error } = await supabase.from('profiles').select('*').eq('email', 'vikramvicky1466@gmail.com');
  console.log('Profile in public.profiles table:', data);
}

checkProfile();

