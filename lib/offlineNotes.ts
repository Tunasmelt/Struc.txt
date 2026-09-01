/** A local-first read cache backed by IndexedDB. This is NOT a queue for
 *  offline writes — every mutation still goes straight to Supabase via the
 *  existing Server Actions (see app/actions/notes.ts, app/actions/audio.ts).
 *  All this does is let the board render instantly from whatever was seen
 *  last time, instead of showing a blank/loading board until the network
 *  round-trip to Supabase resolves — that gap (plus a second round-trip for
 *  templates) was the source of the "feels stale" complaint. The board still
 *  refreshes from Supabase in the background on every load and re-caches
 *  whatever comes back, so the cache can never get more than one load stale.
 *
 *  RawNote/ResolvedTemplate are the same shapes used everywhere else in the
 *  board — this module just knows how to shuttle them in and out of
 *  IndexedDB, it doesn't know anything about their internals. */

import type { RawNote, ResolvedTemplate } from '@/components/board/types'

const DB_NAME = 'noteflow-cache'
const DB_VERSION = 1
const NOTES_STORE = 'notes'
const TEMPLATES_STORE = 'templates'

function isSupported() {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isSupported()) return Promise.resolve(null)
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(NOTES_STORE)) db.createObjectStore(NOTES_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(TEMPLATES_STORE)) db.createObjectStore(TEMPLATES_STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    // A private-browsing tab, a disabled-storage policy, or a corrupted DB
    // should degrade to "no cache" rather than break the board.
    req.onerror = () => resolve(null)
  })
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | undefined> {
  const db = await openDb()
  if (!db) return undefined
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const req = run(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(undefined)
  })
}

export async function getCachedNotes(): Promise<RawNote[]> {
  const db = await openDb()
  if (!db) return []
  return new Promise((resolve) => {
    const tx = db.transaction(NOTES_STORE, 'readonly')
    const req = tx.objectStore(NOTES_STORE).getAll()
    req.onsuccess = () => resolve((req.result as RawNote[]) || [])
    req.onerror = () => resolve([])
  })
}

/** Replaces the entire cached note set — used after a fresh load from
 *  Supabase, so deletions/edits made elsewhere are reflected rather than
 *  leaving stale rows behind forever. */
export async function cacheNotes(notes: RawNote[]): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(NOTES_STORE, 'readwrite')
    const store = tx.objectStore(NOTES_STORE)
    store.clear()
    notes.forEach((n) => store.put(n))
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

/** Upserts a single note — used for optimistic local writes (create/edit) so
 *  the cache doesn't have to wait for the next full reload to pick them up. */
export async function cacheNote(note: RawNote): Promise<void> {
  await withStore(NOTES_STORE, 'readwrite', (store) => store.put(note))
}

export async function deleteCachedNote(id: string): Promise<void> {
  await withStore(NOTES_STORE, 'readwrite', (store) => store.delete(id))
}

export async function getCachedTemplates(): Promise<ResolvedTemplate[]> {
  const db = await openDb()
  if (!db) return []
  return new Promise((resolve) => {
    const tx = db.transaction(TEMPLATES_STORE, 'readonly')
    const req = tx.objectStore(TEMPLATES_STORE).getAll()
    req.onsuccess = () => resolve((req.result as ResolvedTemplate[]) || [])
    req.onerror = () => resolve([])
  })
}

export async function cacheTemplates(templates: ResolvedTemplate[]): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(TEMPLATES_STORE, 'readwrite')
    const store = tx.objectStore(TEMPLATES_STORE)
    store.clear()
    templates.forEach((t) => store.put(t))
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

/** Wipes the local cache — call on logout so the next sign-in (possibly a
 *  different account on a shared machine) never hydrates from someone
 *  else's notes. */
export async function clearNoteCache(): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction([NOTES_STORE, TEMPLATES_STORE], 'readwrite')
    tx.objectStore(NOTES_STORE).clear()
    tx.objectStore(TEMPLATES_STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}
