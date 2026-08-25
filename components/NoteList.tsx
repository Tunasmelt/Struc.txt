'use client'

interface Note {
  id: string
  title: string | null
  raw_text: string
  created_at: string
  updated_at: string
}

interface NoteListProps {
  notes: Note[]
  loading?: boolean
}

export default function NoteList({ notes, loading }: NoteListProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center text-gray-500">Loading notes...</div>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">No notes yet</p>
          <p className="text-sm">Paste some text above to create your first note</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Your Notes ({notes.length})</h2>
      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900">
                {note.title || 'Untitled Note'}
              </h3>
              <span className="text-xs text-gray-500">
                {new Date(note.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-gray-600 text-sm line-clamp-3">
              {note.raw_text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}