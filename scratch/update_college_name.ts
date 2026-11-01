import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseServerClient } from '../server/supabase.ts';

async function updateLiveCollege() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase is not configured!');
  }

  console.log('Updating institution in live Supabase database...');
  const { data, error } = await supabase
    .from('institutions')
    .upsert({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Erode Sengunthar Engineering College',
      code: 'ESEC',
      domain: 'esec.ac.in',
      state: 'Tamil Nadu',
    })
    .select();

  if (error) {
    console.error('Error updating institution:', error.message);
  } else {
    console.log('✓ Successfully updated institution in Supabase:', data);
  }
}

updateLiveCollege().catch(err => {
  console.error('Error:', err);
});

