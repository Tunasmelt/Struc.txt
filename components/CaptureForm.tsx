'use client'

import { useState } from 'react'

interface CaptureFormProps {
  onCapture: (text: string) => Promise<void>
}

export default function CaptureForm({ onCapture }: CaptureFormProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    setError(null)

    try {
      await onCapture(text)
      setText('')
    } catch (err: any) {
      setError(err.message || 'Failed to save note')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4">Capture Note</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="note-text" className="block text-sm font-medium text-gray-700 mb-1">
            Paste your text here
          </label>
          <textarea
            id="note-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your note content..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Note'}
        </button>
      </form>
    </div>
  )
}