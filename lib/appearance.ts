/* Shared light/dark appearance persistence for the public marketing pages
   (landing + auth). The interactive board keeps its own in-memory appearance
   state (see components/board/Topbar.tsx) and does not persist it, so there
   is no existing localStorage convention to reuse there — this key is scoped
   to the pre-auth chrome only. */

export type Appearance = 'light' | 'dark'

const KEY = 'noteflow-appearance'

export function getStoredAppearance(): Appearance {
  if (typeof window === 'undefined') return 'dark'
  try {
    return window.localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function storeAppearance(mode: Appearance): void {
  try {
    window.localStorage.setItem(KEY, mode)
  } catch {
    /* ignore (private browsing, storage disabled, etc.) */
  }
}

export function applyAppearance(mode: Appearance): void {
  document.documentElement.setAttribute('data-mode', mode)
}
