# Charis Christian Center Console (CCC)

Production church management console for Charis Christian Center.

**Live:** https://ccc-neon-nu.vercel.app  
**Repo:** https://github.com/Kwameboat/CCC

## Features

| Module | Capability |
|--------|------------|
| Login | Supabase Auth + password reset (demo login local/dev only) |
| Dashboard | Live members, treasury, MTD income, today’s check-ins, attendance chart, birthdays |
| Members | Branch CRUD, photos, ID cards, CSV export |
| Finance | Ledger + CSV export |
| Attendance | Check-in, kiosk, realtime feed |
| Counseling | Confidential session notes |
| Store / Sermons / Events | Supabase CRUD |
| Communication | Audience targeting + broadcast queue (+ optional `broadcasts` table) |
| CMS | Session-gated page drafts |
| Settings | Deploy checklist, schema health, campus registration, RBAC docs |

## Production setup (required)

1. **Supabase**
   - Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor (v7.0).
   - Create staff users in Authentication → Users.
   - Enable Realtime on `attendance` if using the live kiosk feed.

2. **Environment variables** (local `.env.local` and Vercel Production/Preview)

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# Never enable on Vercel Production:
# VITE_ENABLE_DEMO_LOGIN=true
```

3. **Vercel**
   - Connect this repo (already live at `ccc-neon-nu.vercel.app`).
   - Set the two `VITE_*` vars above.
   - Redeploy after saving env vars.

4. **Verify**
   - `npm run build` succeeds.
   - Login with a real Supabase user.
   - Confirm Dashboard / Members / Finance load for a branch.

## Local development

```bash
cp .env.example .env.local   # then fill values
npm install
npm run dev                  # http://localhost:3000
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Security notes

- Secrets must live in env vars — the app refuses to boot without them.
- Demo login is disabled unless `import.meta.env.DEV` or `VITE_ENABLE_DEMO_LOGIN=true`.
- RLS currently allows all authenticated staff; tighten per `profiles.role` when you need stricter isolation.
- Payment provider secret keys must only live in Edge Functions, never the browser.
- Prefer Supabase Storage for member photos instead of large base64 strings.

## Version

`4.3.0` — full production readiness pass.
