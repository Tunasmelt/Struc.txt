/** Guest mode marker — a plain cookie (not localStorage) because proxy.ts
 *  runs on the edge and needs to read it to let an unauthenticated visitor
 *  through to /board without redirecting to /login. Client code reads the
 *  same cookie via document.cookie rather than keeping a second copy in
 *  localStorage that could drift out of sync with it. */

const COOKIE = 'nf_guest'
const MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export function isGuestMode(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split('; ').includes(`${COOKIE}=1`)
}

export function enableGuestMode() {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE}=1; path=/; max-age=${MAX_AGE}; SameSite=Lax`
}

/** Clears the guest cookie — used when a guest signs in/up for real, so a
 *  later logout doesn't fall back into guest mode by accident. Does NOT
 *  touch the guest note store itself (see lib/guestNotes.ts clearGuestNotes)
 *  — those are separate calls since a caller may want to keep local notes
 *  around across the transition. */
export function exitGuestMode() {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE}=; path=/; max-age=0`
}
