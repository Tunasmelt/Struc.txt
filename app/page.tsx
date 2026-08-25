import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CaptureForm from '@/components/CaptureForm'
import NoteList from '@/components/NoteList'
import { createNote, getNotes } from '@/app/actions/notes'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const notes = await getNotes()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight animate-fade-in">NoteFlow</h1>
            <p className="text-sm text-gray-500 mt-1">Logged in as {user.email}</p>
          </div>
          <form action="/auth/logout" method="post">
            <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md shadow-sm hover:bg-gray-50 transition-colors font-medium cursor-pointer">
              Sign Out
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <CaptureForm onCapture={createNote} />
          </div>
          <div className="lg:col-span-2">
            <NoteList notes={notes} />
          </div>
        </div>
      </div>
    </main>
  )
}
