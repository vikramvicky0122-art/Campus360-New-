import dotenv from 'dotenv';
dotenv.config();

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getUrl = () => process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const getKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Checks if a real, valid Supabase project has been configured in .env
 */
export const isSupabaseConfigured = (): boolean => {
  const url = getUrl();
  const key = getKey();
  return (
    Boolean(url) &&
    Boolean(key) &&
    !url.includes('xyzcompany.supabase.co') &&
    !key.includes('eyJhbGciOi...') &&
    url.startsWith('https://')
  );
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseServerClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    const url = getUrl();
    const key = getKey();
    clientInstance = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return clientInstance;
};

