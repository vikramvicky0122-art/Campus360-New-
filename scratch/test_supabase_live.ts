import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

async function testSupabaseConnection() {
  console.log('Testing live Supabase connection...');
  const url = process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  console.log(`URL: ${url}`);
  const client = createClient(url, key);

  const { data: insts, error: instErr } = await client.from('institutions').select('*');
  if (instErr) {
    console.error('Error querying institutions:', instErr.message);
  } else {
    console.log(`✓ Connected! Found ${insts?.length || 0} institutions in Supabase.`);
  }

  const { data: profiles, error: profErr } = await client.from('profiles').select('*');
  if (profErr) {
    console.error('Error querying profiles:', profErr.message);
  } else {
    console.log(`✓ Profiles table ready! Total profiles: ${profiles?.length || 0}.`);
  }
}

testSupabaseConnection().catch(err => {
  console.error('Test error:', err);
});

