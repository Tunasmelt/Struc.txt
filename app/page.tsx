import { redirect } from 'next/navigation'
import { createClient } from '@/lib/appwrite/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { account } = await createClient()
  
  try {
    const user = await account.get()
    if (!user) {
      redirect('/login')
    }
  } catch {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">NoteFlow</h1>
          <form action="/auth/logout" method="post">
            <button className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300">
              Sign Out
            </button>
          </form>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Welcome to NoteFlow</h2>
          <p className="text-gray-600">Your corkboard is ready. Start capturing notes.</p>
        </div>
      </div>
    </main>
  )
}
