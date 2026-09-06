# Lab platform — skeleton

Next.js (App Router) + Supabase (Postgres + Auth). This is the skeleton
milestone: email/password signup+login, role-based routing (student vs
admin), and the full database schema — no M1/M2/M3 features yet.

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. Once it's provisioned, go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Paste the URL and anon key from step 1 into `.env.local`.

## 3. Run the schema migration

Open the Supabase dashboard → **SQL Editor**, paste the entire contents of
`supabase/migrations/0001_init.sql`, and run it. This creates every table
from the schema (profiles, cohorts, submissions, questions, groups,
validations, etc.), the RLS policies, and the trigger that auto-creates a
`profiles` row whenever someone signs up.

## 4. (Recommended for now) Disable email confirmation

By default Supabase requires users to click a confirmation link before they
can log in. For local development this just adds friction. To turn it off:
**Authentication → Sign In / Providers → Email → uncheck "Confirm email"**.
Turn it back on before this goes in front of real students, or wire up the
confirmation email flow properly.

## 5. Run it locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/login` since you're not
authenticated. Sign up a user; they land in `public.profiles` with
`role = 'student'` automatically.

## 6. Make yourself an admin

New users default to `role = 'student'`. Promote one manually in the SQL
Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Log out and back in — you should now see the "Go to admin area" link on
`/dashboard`, and `/admin` should load instead of redirecting you away.

## 7. Deploy

1. Push this repo to GitHub.
2. Import it into Vercel (https://vercel.com/new).
3. In the Vercel project's **Settings → Environment Variables**, add the
   same two variables from `.env.local`.
4. Deploy.
5. Back in Supabase, under **Authentication → URL Configuration**, add your
   Vercel deployment URL to the allowed redirect URLs (needed for the email
   confirmation link to work in production, if you re-enable it).

## What's actually being tested here

- Signup writes to Supabase Auth; the trigger mirrors a row into
  `public.profiles`.
- Login sets a session cookie; `middleware.ts` refreshes it on every request.
- Visiting `/dashboard` while logged out redirects to `/login`.
- Visiting `/admin` as a student redirects to `/dashboard`; as an admin, it
  loads.

Once this round-trip works end to end, in production, on Vercel — that's the
skeleton done. M1 (hypothesis + 16-question form, admin review) is next.
