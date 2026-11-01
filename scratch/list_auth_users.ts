import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseServerClient } from '../server/supabase.ts';

async function listUsers() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const { data } = await supabase.auth.admin.listUsers();
  console.log(`Total users in Supabase Auth -> Users page: ${data?.users?.length || 0}`);
  data?.users?.forEach((u, i) => {
    console.log(`${i + 1}. Email: ${u.email} | Confirmed at: ${u.email_confirmed_at} | Created at: ${u.created_at}`);
  });
}

listUsers();

