import { createClient } from '@/lib/appwrite/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function POST() {
  const { account } = await createClient()
  await account.deleteSession('current')
  const cookieStore = await cookies()
  // Clear all session cookies
  cookieStore.getAll().forEach(cookie => {
    cookieStore.delete(cookie.name)
  })
  redirect('/login')
}
