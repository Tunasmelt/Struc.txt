import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/board', '/templates']

/** Refreshes the Supabase auth cookie on every request (required for SSR
 *  auth to keep working reliably in production — the server client's own
 *  `setAll` is a no-op outside middleware, see lib/supabase/server.ts) and
 *  redirects unauthenticated visitors away from protected routes. Without
 *  this, `/board` and `/templates` render for a logged-out visitor as an
 *  empty page instead of sending them to `/login` — RLS keeps their data
 *  safe either way, but the UX is broken. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Guest mode (see lib/guestMode.ts) trades auth for a plain cookie set by
  // the "Continue as guest" button on /login — it lets an unauthenticated
  // visitor onto /board with an entirely local, IndexedDB-only note store
  // (lib/guestNotes.ts) that never touches Supabase. /templates stays
  // login-only: guest mode ships a hardcoded preset list precisely so it
  // never needs a DB read at all, and template management is a DB-backed
  // feature guest mode doesn't offer.
  const isGuest = request.cookies.get('nf_guest')?.value === '1'
  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p))
  const guestExempt = isGuest && request.nextUrl.pathname.startsWith('/board')
  if (!user && isProtected && !guestExempt) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
