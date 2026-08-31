# DEPLOY.md — NoteFlow on Vercel

Assumes `docs/SETUP.md` is already done (Supabase project created, migrations `001`-`007` applied, Gemini/Groq keys obtained). This covers only what's specific to shipping to Vercel.

## 1. Push to GitHub and import

Push this repo to GitHub, then [import it in Vercel](https://vercel.com/new) as a new project. Vercel auto-detects Next.js — no build command changes needed (`next build` / `next start` from `package.json` are used as-is).

## 2. Environment variables

In the Vercel project's **Settings → Environment Variables**, set the four variables from `.env.example`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, "anon public" key |
| `GEMINI_API_KEY` | Google AI Studio |
| `GROQ_API_KEY` | Groq Console |

Set these for the Production environment (and Preview, if you want preview deployments to work fully). Redeploy after adding them if the first deploy ran before they were set.

## 3. Supabase Auth: add the Vercel domain

Supabase needs to know your production URL to redirect magic-link/signup-confirmation emails back to the right place. In the Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: your production domain, e.g. `https://your-app.vercel.app`
- **Redirect URLs**: add the same domain (and any preview-deployment wildcard domain, e.g. `https://your-app-*.vercel.app`, if you want magic links to work from preview deploys too)

Without this, `signInWithOtp` (the "email me a sign-in link" flow) and signup confirmation emails will redirect back to `localhost` instead of your live site.

## 4. Auth session refresh + route protection

Already handled by `proxy.ts` (Next.js's Proxy convention — formerly "Middleware"; see its file for why the rename) — it refreshes the Supabase session cookie on every request and redirects unauthenticated visitors away from `/board` and `/templates`. Nothing to configure here, just confirming it's in place and doesn't need Vercel-specific setup — it runs on Vercel's standard Node.js runtime like the rest of the app (nothing in this project uses the Edge runtime).

## 5. Storage bucket

The `audio-captures` private Supabase Storage bucket (for Phase 6 recordings) is created by migration `007_audio_storage_bucket.sql`, not by any Vercel-side step. If recordings 500 in production after an otherwise-successful deploy, confirm that migration actually ran against the Supabase project Vercel is pointed at.

## 6. Post-deploy smoke test

Once deployed: sign up a real account, capture a note (paste and/or record), confirm it restructures, confirm search finds it, and confirm an unauthenticated tab redirects `/board` to `/login`. That last one is the one thing genuinely new to this deploy (`proxy.ts`) rather than already-verified app behavior.
