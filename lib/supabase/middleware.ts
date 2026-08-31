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

  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p))
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
