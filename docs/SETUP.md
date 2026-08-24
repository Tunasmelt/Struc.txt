# SETUP.md — NoteFlow

This document contains the setup steps that require a real Appwrite project and credentials. The codebase is scaffolded and ready, but you need to complete these steps to connect it to a live Appwrite instance.

---

## Prerequisites

- An Appwrite account (free tier is sufficient)
- Node.js and npm installed (already done in the repo)
- Appwrite CLI (optional, but recommended for local development)

---

## Step 1: Create an Appwrite Project

1. Go to [https://appwrite.io](https://appwrite.io) and sign in
2. Click "Create Project"
3. Choose a name (e.g., "noteflow")
4. Choose a region closest to your users
5. Click "Create Project"
6. Wait for the project to be provisioned (typically 1-2 minutes)

---

## Step 2: Get Your Credentials

From your Appwrite project dashboard:

1. Navigate to **Settings → API Keys**
2. Click "Create API Key"
3. Give it a name (e.g., "noteflow-server")
4. Select the following scopes:
   - `databases.read`
   - `databases.write`
   - `users.read`
   - `users.write`
   - `files.read`
   - `files.write`
5. Copy the API Key (save this securely)
6. Navigate to **Settings → General**
7. Copy the following values:
   - **Project ID** (e.g., `645xxxxxxxxxxxxxxxx`)
   - **API Endpoint** (e.g., `https://cloud.appwrite.io/v1`)

⚠️ **Important:** Never commit the `APPWRITE_API_KEY` to version control. It has full admin access to your project.

---

## Step 3: Configure Environment Variables

Update `.env.local` in the repo root with your actual credentials:

```env
# Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_actual_project_id_here
APPWRITE_API_KEY=your_actual_api_key_here

# AI Providers (get these from their respective dashboards)
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

---

## Step 4: Create Database Collections

### Option A: Using Appwrite Console (recommended for first-time setup)

1. Navigate to **Databases** in your Appwrite dashboard
2. Click "Create Database" (if needed, default database is usually sufficient)
3. For each collection listed below, create it manually via the console:
   - **templates**: name (string), icon_color (string), fields (string, JSON), is_preset (boolean), created_at (datetime)
   - **boards**: name (string), theme (string), created_at (datetime)
   - **notes**: title (string), note_date (string), raw_text (string), audio_path (string), transcript_source (string), position (string, JSON), search (string), created_at (datetime), updated_at (datetime)
   - **note_versions**: body (string, JSON), model_used (string), prompt_version (string), created_at (datetime)
   - **tags**: name (string), created_at (datetime)
   - **note_tags**: status (string), created_at (datetime)
   - **action_items**: text (string), due_date (string), status (string), source (string), created_at (datetime)
   - **shares**: resource_type (string), token (string), expires_at (string), revoked_at (string), created_at (datetime)

4. For each collection, set **Document Security** to **Enabled** in collection settings
5. For the `notes` collection, create a **fulltext index** on the `search` attribute (this enables Phase 5 search)

### Option B: Using the Setup Script (for advanced users)

You can run the collection creation script:

```bash
# This requires the server SDK with API key configured
node -e "require('./lib/appwrite/collections').createCollections()"
```

Note: The script may not create indexes due to SDK signature differences. Create the fulltext index manually in the console.

---

## Step 5: Enable Email Auth (Required for Login Flow)

1. Navigate to **Auth** in your Appwrite dashboard
2. Ensure "Email/Password" provider is enabled
3. For development, you may want to disable email verification under **Settings** (not recommended for production)

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

## Step 8: Verify Document Permissions

To confirm document permissions are working correctly:

1. Sign up with two different email accounts (User A and User B)
2. Create a note as User A (this will be testable once Phase 1's note capture is implemented)
3. Sign out and sign in as User B
4. User B should not be able to see User A's notes

The collections use document permissions (Role.user(userId)) to ensure users can only access their own data. When creating documents via the client SDK, the creator is automatically granted read/update/delete permissions.

---

## Troubleshooting

### "Invalid Appwrite credentials" errors

- Ensure `NEXT_PUBLIC_APPWRITE_ENDPOINT` and `NEXT_PUBLIC_APPWRITE_PROJECT_ID` are correctly set
- Check that the Appwrite project is active
- Verify the API key has the required scopes

### Collection creation fails

- Ensure you're using a fresh project (no existing collections with conflicting names)
- Check that your API key has `databases.write` scope

### Build errors with placeholder env vars

- The app uses dynamic rendering to avoid build-time validation of placeholder env vars
- If you see build errors, ensure pages have `export const dynamic = 'force-dynamic'`

### Email confirmation not received

- Check your spam folder
- Temporarily disable email confirmation for development (Auth → Settings)
- Ensure the Email provider is enabled in Auth → Providers

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
- Triggers for automatic search_vector updates
