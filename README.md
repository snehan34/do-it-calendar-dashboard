# do it calendar

A student calendar for assignments and social events. The production stack is Vite + React on Vercel, with Supabase Auth and Postgres for password authentication, email confirmation, password recovery, profiles, modules, people groups, assignments, and events.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

Without Supabase variables, development uses a browser-only demo workspace. Production builds never expose demo credentials or demo storage: they show a configuration screen until Supabase is connected.

## Production setup

1. Create a Supabase project directly or install Supabase from the Vercel Marketplace.
2. Open the Supabase SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. In Supabase Auth, keep **Confirm email** enabled. The app uses Supabase's secure confirmation and password-recovery links, so the default templates work without a paid sender domain.
4. Add these variables to Vercel for Production and Preview environments:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Set the Supabase Auth **Site URL** to the production Vercel/custom-domain URL. Add localhost and Vercel preview URLs to the allowed redirect list when needed.
6. Redeploy the Vercel project.

Supabase's built-in mailer is suitable for a hobby project and initial testing, but it has strict rate limits. Add a verified domain and custom SMTP later if the app needs higher-volume or branded email delivery.

Only the Supabase anon key belongs in the browser. Never expose the service-role key. Data access is enforced by the Row Level Security policies in the schema.

## Verification

```powershell
npm.cmd run build
```

The Vercel configuration serves the single-page application correctly and adds baseline browser security headers.
