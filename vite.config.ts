import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';

// ---------------------------------------------------------------------------
// Dev-only plugin: handles /api/register in local dev (vite dev server).
// On Vercel, api/register.js is the serverless function that runs instead.
// Uses the service role key server-side — never exposed to the browser.
// ---------------------------------------------------------------------------
function devRegisterApiPlugin(serviceRoleKey: string, supabaseUrl: string): Plugin {
  return {
    name: 'dev-register-api',
    apply: 'serve', // only active during `vite dev`, not during build
    configureServer(server) {
      server.middlewares.use('/api/register', async (req: any, res: any, next: any) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end('{}');
        }
        if (req.method !== 'POST') return next();

        res.setHeader('Content-Type', 'application/json');

        if (!serviceRoleKey || !supabaseUrl) {
          res.writeHead(500);
          return res.end(JSON.stringify({ error: 'Server env vars VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured in .env' }));
        }

        // Read body
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const {
              email, password, fullName, rollNumber,
              phone, department, yearOfStudy, institutionId,
            } = JSON.parse(body || '{}');

            if (!email || !password || !fullName || !rollNumber || !institutionId) {
              res.writeHead(400);
              return res.end(JSON.stringify({ error: 'Missing required fields.' }));
            }
            if ((password || '').length < 6) {
              res.writeHead(400);
              return res.end(JSON.stringify({ error: 'Password must be at least 6 characters.' }));
            }

            const trimmedEmail = email.trim().toLowerCase();
            const cleanRoll = (rollNumber || '').trim().toUpperCase();
            const authHeaders = {
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
            };

            // Check duplicate email via Supabase Admin REST API
            const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, { headers: authHeaders });
            if (listRes.ok) {
              const listData = await listRes.json();
              const emailExists = (listData.users || []).some(
                (u: any) => u.email?.toLowerCase() === trimmedEmail
              );
              if (emailExists) {
                res.writeHead(409);
                return res.end(JSON.stringify({ error: 'This email address is already registered. Please sign in instead.' }));
              }
            }

            // Check duplicate roll number via Supabase REST API
            const profileRes = await fetch(
              `${supabaseUrl}/rest/v1/profiles?roll_number=eq.${cleanRoll}&institution_id=eq.${institutionId}&select=id`,
              { headers: { ...authHeaders, 'Prefer': 'return=representation' } }
            );
            if (profileRes.ok) {
              const profiles = await profileRes.json();
              if (Array.isArray(profiles) && profiles.length > 0) {
                res.writeHead(409);
                return res.end(JSON.stringify({ error: 'This roll number is already registered in your institution.' }));
              }
            }

            // Create user — email_confirm:true → NO email sent at all
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
              const errMsg = createData.message || createData.msg || JSON.stringify(createData);
              res.writeHead(400);
              return res.end(JSON.stringify({ error: errMsg }));
            }

            res.writeHead(200);
            res.end(JSON.stringify({
              success: true,
              message: 'Registration submitted. Pending campus admin approval.',
              userId: createData.id,
            }));
          } catch (err: any) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // loadEnv loads ALL keys from .env (empty prefix = no filter)
  const env = loadEnv(mode, process.cwd(), '');

  const supabaseUrl = env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  return {
    plugins: [react(), tailwindcss(), devRegisterApiPlugin(serviceRoleKey, supabaseUrl)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
