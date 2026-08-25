# SETUP.md — NoteFlow

This document contains the setup steps that require a real Supabase project and credentials. The codebase is scaffolded and ready, but you need to complete these steps to connect it to a live Supabase instance.

---

## Prerequisites

- A Supabase account (free tier is sufficient)
- Node.js and npm installed (already done in the repo)
- Supabase CLI (optional, but recommended for local development)

---

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose a name (e.g., "noteflow")
4. Choose a database password (save this securely)
5. Choose a region closest to your users
6. Click "Create new project"
7. Wait for the project to be provisioned (typically 1-2 minutes)

---

## Step 2: Get Your Credentials

From your Supabase project dashboard:

1. Navigate to **Settings → API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxxxxx.supabase.co`)
   - **anon public key** (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

⚠️ **Important:** The anon key is safe to use in client code as long as Row-Level Security (RLS) is enabled on your tables. Never use the service_role key in client code.

---

## Step 3: Configure Environment Variables

Update `.env.local` in the repo root with your actual credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# AI Providers (get these from their respective dashboards)
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

---

## Step 4: Run Database Migration

The database schema is defined in `supabase/migrations/001_base_schema.sql`. You can apply it in two ways:

### Option A: Using Supabase Dashboard (recommended for first-time setup)

1. Navigate to **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy the contents of `supabase/migrations/001_base_schema.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the migration

### Option B: Using Supabase CLI (for advanced users)

If you have the Supabase CLI installed:

```bash
# Link your local project to your Supabase project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

---

## Step 5: Enable Email Auth (Required for Login Flow)

1. Navigate to **Authentication → Providers** in your Supabase dashboard
2. Ensure "Email" provider is enabled
3. For development, you may want to disable email confirmation under **Authentication → Settings** (not recommended for production)

---

## Step 6: Get AI Provider API Keys

### Gemini API Key

1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to `.env.local` as `GEMINI_API_KEY`

### Groq API Key

1. Go to [https://console.groq.com/keys](https://console.groq.com/keys)
2. Sign in or create an account
3. Click "Create API Key"
4. Copy the key and add it to `.env.local` as `GROQ_API_KEY`

---

## Step 7: Verify the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser
3. You should be redirected to the login page
4. Click "Sign Up" and enter an email/password
5. You should be logged in and see the welcome page

---

## Step 8: Verify Row-Level Security

To confirm RLS is working correctly:

1. Sign up with two different email accounts (User A and User B)
2. Create a note as User A (this will be testable once Phase 1's note capture is implemented)
3. Sign out and sign in as User B
4. User B should not be able to see User A's notes

The tables use Row-Level Security (RLS) policies to ensure users can only access their own data. The migration includes placeholder policies that you may need to customize based on your auth setup.

---

## Troubleshooting

### "Invalid Supabase credentials" errors

- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correctly set
- Check that the Supabase project is active
- Verify the anon key is from the correct project

### Migration fails

- Ensure you're using a fresh project (no existing tables with conflicting names)
- Check that your database has the required extensions (uuid-ossp)
- Review the SQL error message in the Supabase dashboard

### Build errors with placeholder env vars

- The app uses dynamic rendering to avoid build-time validation of placeholder env vars
- If you see build errors, ensure pages have `export const dynamic = 'force-dynamic'`

### Email confirmation not received

- Check your spam folder
- Temporarily disable email confirmation for development (Authentication → Settings)
- Ensure the Email provider is enabled in Authentication → Providers

---

## Next Steps

After completing this setup:

1. The app should build successfully: `npm run build`
2. You can sign up and log in
3. You're ready to proceed to **Phase 1** (Paste capture) per `PHASES_AND_GATES.md`

The migration SQL in `supabase/migrations/001_base_schema.sql` includes:
- All required tables (users, templates, notes, note_versions, tags, note_tags, action_items, boards)
- Row-level security policies on every table
- Full-text search index on notes
- Triggers for automatic updated_at and search vector updates
