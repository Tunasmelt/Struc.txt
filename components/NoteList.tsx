'use client'

import { useState } from 'react'

interface NoteVersion {
  id: string
  note_id: string
  body: {
    summary?: string
    attendees?: string[]
    key_decisions?: string[]
    discussion_points?: Array<{ topic: string; details: string }>
    action_items?: Array<{ item: string; assignee?: string | null; due_date?: string | null }>
    fallback_unstructured?: boolean
    [key: string]: unknown
  }
  model_used?: string
  prompt_version?: string
  created_at: string
}

interface Note {
  id: string
  title: string | null
  raw_text: string
  created_at: string
  updated_at: string
  note_versions?: NoteVersion[]
}

interface NoteListProps {
  notes: Note[]
  loading?: boolean
}

export default function NoteList({ notes, loading }: NoteListProps) {
  const [activeTab, setActiveTab] = useState<Record<string, 'structured' | 'raw'>>({})

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
          <p className="text-lg mb-2 font-medium">No notes yet</p>
          <p className="text-sm text-gray-400">Paste raw text above to test the capture and AI restructuring pipeline</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Notes ({notes.length})</h2>
      <div className="space-y-4">
        {notes.map((note) => {
          const versions = note.note_versions || []
          const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null
          const viewMode = activeTab[note.id] || (latestVersion ? 'structured' : 'raw')
          const body = latestVersion?.body

          return (
            <div
              key={note.id}
              className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors bg-gray-50/50"
            >
              <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {note.title || 'Untitled Note'}
                  </h3>
                  <span className="text-xs text-gray-400">
                    Created {new Date(note.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {latestVersion ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Structured (Meeting Minutes)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 animate-pulse">
                      Restructuring...
                    </span>
                  )}
                </div>
              </div>

              {/* Version details badge */}
              {latestVersion && (
                <div className="text-xs text-gray-500 flex flex-wrap gap-3 mb-3 bg-white p-2 rounded border border-gray-100">
                  <span>
                    <strong>Model:</strong> {latestVersion.model_used || 'Unknown'}
                  </span>
                  <span>
                    <strong>Prompt:</strong> {latestVersion.prompt_version || 'N/A'}
                  </span>
                </div>
              )}

              {/* View mode toggle */}
              <div className="flex border-b border-gray-200 mb-3 text-xs">
                <button
                  onClick={() => setActiveTab({ ...activeTab, [note.id]: 'structured' })}
                  disabled={!latestVersion}
                  className={`pb-1.5 px-3 font-medium transition-colors border-b-2 ${
                    viewMode === 'structured' && latestVersion
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600 disabled:opacity-50'
                  }`}
                >
                  Structured View
                </button>
                <button
                  onClick={() => setActiveTab({ ...activeTab, [note.id]: 'raw' })}
                  className={`pb-1.5 px-3 font-medium transition-colors border-b-2 ${
                    viewMode === 'raw'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Raw Capture
                </button>
              </div>

              {/* Content rendering */}
              {viewMode === 'structured' && latestVersion && body ? (
                <div className="space-y-3 text-sm text-gray-700 bg-white p-4 rounded border border-gray-200">
                  {body.summary && (
                    <div>
                      <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider text-indigo-700 mb-1">
                        Executive Summary
                      </h4>
                      <p>{body.summary}</p>
                    </div>
                  )}

                  {body.attendees && body.attendees.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider text-indigo-700 mb-1">
                        Attendees
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {body.attendees.map((person, idx) => (
                          <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">
                            {person}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {body.key_decisions && body.key_decisions.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider text-indigo-700 mb-1">
                        Key Decisions
                      </h4>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        {body.key_decisions.map((decision, idx) => (
                          <li key={idx}>{decision}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {body.discussion_points && body.discussion_points.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider text-indigo-700 mb-1">
                        Discussion Points
                      </h4>
                      <div className="space-y-1.5">
                        {body.discussion_points.map((point, idx) => (
                          <div key={idx} className="border-l-2 border-indigo-200 pl-2">
                            <span className="font-medium text-gray-800">{point.topic}: </span>
                            <span className="text-gray-600">{point.details}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {body.action_items && body.action_items.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider text-indigo-700 mb-1">
                        Action Items
                      </h4>
                      <div className="space-y-1">
                        {body.action_items.map((action, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-indigo-50/50 p-1.5 rounded text-xs">
                            <input type="checkbox" disabled className="rounded text-indigo-600" />
                            <span className="flex-1 font-medium">{action.item}</span>
                            {action.assignee && (
                              <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">
                                @{action.assignee}
                              </span>
                            )}
                            {action.due_date && (
                              <span className="text-gray-400 text-[10px]">
                                Due: {action.due_date}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-3 rounded border border-gray-200 font-mono text-xs text-gray-700 whitespace-pre-wrap">
                  {note.raw_text}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}