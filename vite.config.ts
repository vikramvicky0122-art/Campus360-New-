import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

// ---------------------------------------------------------------------------
// Dev-only plugin: handles /api/register in local dev (vite dev server).
// On Vercel, api/register.js is the serverless function that runs instead.
// Uses the service role key server-side — never exposed to the browser.
// ---------------------------------------------------------------------------
function devRegisterApiPlugin(): Plugin {
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

        // Read body
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json');
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

            // Dynamically import @supabase/supabase-js (already in node_modules)
            const { createClient } = await import('@supabase/supabase-js');

            const supabaseUrl = process.env.VITE_SUPABASE_URL;
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!supabaseUrl || !serviceKey) {
              res.writeHead(500);
              return res.end(JSON.stringify({ error: 'Server env vars not configured.' }));
            }

            const admin = createClient(supabaseUrl, serviceKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            });

            const trimmedEmail = email.trim().toLowerCase();
            const cleanRoll = (rollNumber || '').trim().toUpperCase();

            // Check duplicate email
            const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
            const emailExists = listData?.users?.some(
              (u: any) => u.email?.toLowerCase() === trimmedEmail
            );
            if (emailExists) {
              res.writeHead(409);
              return res.end(JSON.stringify({
                error: 'This email address is already registered. Please sign in instead.',
              }));
            }

            // Check duplicate roll number
            const { data: existingProfile } = await admin
              .from('profiles')
              .select('id')
              .eq('roll_number', cleanRoll)
              .eq('institution_id', institutionId)
              .maybeSingle();
            if (existingProfile) {
              res.writeHead(409);
              return res.end(JSON.stringify({
                error: 'This roll number is already registered. Please check your details.',
              }));
            }

            // Create user — email_confirm:true means NO email is sent at all
            const { data: authData, error: authError } = await admin.auth.admin.createUser({
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
            });

            if (authError) {
              res.writeHead(400);
              return res.end(JSON.stringify({ error: authError.message }));
            }

            res.writeHead(200);
            res.end(JSON.stringify({
              success: true,
              message: 'Registration submitted. Pending campus admin approval.',
              userId: authData.user.id,
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

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), devRegisterApiPlugin()],
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
