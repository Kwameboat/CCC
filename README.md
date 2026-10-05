# Charis Christian Center Console (CCC)

Production church management console for Charis Christian Center — multi-branch admin, members, finance, attendance, counseling, store, sermons, events, communications, and CMS.

**Live:** https://ccc-neon-nu.vercel.app  
**Repo:** https://github.com/Kwameboat/CCC

## Features

| Module | Status |
|--------|--------|
| **Login & sessions** | Supabase Auth (password reset supported). Demo login only in local/dev. |
| **Dashboard** | Live member counts, treasury totals, MTD income, today check-ins, 6-month attendance chart, birthdays |
| **Members** | Branch-scoped CRUD, photo, ID card print, CSV export |
| **Finance** | Income/expense ledger via Supabase |
| **Attendance** | Check-in + realtime kiosk / first-timer registration |
| **Counseling** | Session notes CRUD with follow-up status |
| **Store** | Product inventory CRUD (Supabase `products`) |
| **Sermons** | Branch sermon library CRUD |
| **Events** | Branch event scheduling CRUD |
| **Communication** | Composer + birthday list; broadcasts queued until SMS/email provider is wired |
| **CMS** | Page drafts (session-gated; browser-persisted until CMS backend) |
| **Settings** | DB health check, schema script, deployment notes |

## Stack

- React 19 + TypeScript + Vite
- Supabase (Auth, Postgres, Realtime)
- Recharts + Lucide
- Vercel SPA hosting (`vercel.json` rewrites + security headers)

## Local setup

1. **Node.js 18+**
2. Install deps: `npm install`
3. Copy env: `cp .env.example .env.local` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In Supabase SQL Editor, run the schema from **Settings → Database** (or the script embedded in `SettingsView`).
5. Create staff users in Supabase Auth (email/password).
6. Run: `npm run dev` → http://localhost:3000

Optional local demo login: set `VITE_ENABLE_DEMO_LOGIN=true` (never on Vercel production).

## Production (Vercel)

1. Connect the GitHub repo (already linked for https://ccc-neon-nu.vercel.app).
2. Project → Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Do **not** set `VITE_ENABLE_DEMO_LOGIN` in production.
4. Redeploy after env changes.
5. Rotate the anon key if it was previously committed, then update Vercel + `.env.local`.

## Security checklist

- [ ] Env vars set on Vercel (no reliance on source fallbacks)
- [ ] Demo login disabled in production
- [ ] Supabase RLS reviewed (tighten beyond “all authenticated” for finance/counseling when ready)
- [ ] Staff accounts created only via Supabase Auth
- [ ] Prefer Supabase Storage for member photos instead of large base64 in rows

## Scripts

```bash
npm run dev      # local development
npm run build    # typecheck + production build
npm run preview  # preview dist/
```

## Version

`4.2.0` — production hardening: env config, all modules wired, real dashboard metrics, auth hardening.
