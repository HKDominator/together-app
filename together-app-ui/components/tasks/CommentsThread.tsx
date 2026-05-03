// ─────────────────────────────────────────────────────────────────────
// Destination: components/tasks/CommentsThread.tsx
// Gold A2 — comment thread on a task detail page.
//
// Couple-app vibe: chat-style, grouped by author, with avatar bubbles.
// Oldest at the top so the conversation reads naturally.
//
// Data flow is self-contained (not in TasksContext) because comments
// are scoped to a single task and shouldn't sit in global state — it
// would just bloat the cache with data 99% of pages don't need.
// ─────────────────────────────────────────────────────────────────────
'use client'
import { useCallback, useEffect, useState, KeyboardEvent } from 'react'
import { api, isNetworkError } from '@/lib/api'
import { useTasks } from '@/context/TasksContext'
import type { Comment } from '@/types'

interface Props { taskId: string }

const CURRENT_USER_ID = 'u1'  // matches the backend's DEFAULT_AUTHOR

export default function CommentsThread({ taskId }: Props) {
  const { users } = useTasks()
  const [comments, setComments] = useState<Comment[]>([])
  const [draft,    setDraft]    = useState('')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [editing,  setEditing]  = useState<{ id: string; body: string } | null>(null)

  const findUser = useCallback((id: string) => users.find(u => u.id === id), [users])

  // ── Load ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listComments(taskId)
        if (!cancelled) setComments(list)
      } catch (err) {
        if (!cancelled) setError(isNetworkError(err) ? 'offline' : 'Could not load comments.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [taskId])

  // ── Add ────────────────────────────────────────────────────────
  async function handleAdd() {
    const body = draft.trim()
    if (!body) return
    setError(null)

    // Optimistic insert
    const tempId = `tmp_${Date.now()}`
    const nowIso = new Date().toISOString()
    const optimistic: Comment = {
      id: tempId, taskId, authorId: CURRENT_USER_ID, body,
      createdAt: nowIso, updatedAt: nowIso,
    }
    setComments(prev => [...prev, optimistic])
    setDraft('')

    try {
      const real = await api.addComment(taskId, body)
      setComments(prev => prev.map(c => c.id === tempId ? real : c))
    } catch (err) {
      setComments(prev => prev.filter(c => c.id !== tempId))
      setDraft(body)  // give the text back
      setError(isNetworkError(err) ? 'offline — try again when reconnected' : 'Failed to add comment.')
    }
  }

  // ── Edit ───────────────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!editing) return
    const body = editing.body.trim()
    if (!body) return

    const before = comments.find(c => c.id === editing.id)
    if (!before) { setEditing(null); return }

    setComments(prev => prev.map(c => c.id === editing.id ? { ...c, body } : c))
    const savedEditing = editing
    setEditing(null)

    try {
      const real = await api.editComment(savedEditing.id, body)
      setComments(prev => prev.map(c => c.id === real.id ? real : c))
    } catch (err) {
      setComments(prev => prev.map(c => c.id === before.id ? before : c))
      setError(isNetworkError(err) ? 'offline' : 'Failed to save edit.')
    }
  }

  // ── Delete ─────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    const before = comments.find(c => c.id === id)
    if (!before) return
    setComments(prev => prev.filter(c => c.id !== id))
    try {
      await api.deleteComment(id)
    } catch (err) {
      setComments(prev => [...prev, before].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
      setError(isNetworkError(err) ? 'offline' : 'Failed to delete comment.')
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleAdd() }
  }

  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    if (sameDay) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      + ' · '
      + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="mt-8">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
        Conversation
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cr-pale text-cr text-[10px] font-bold">
          {comments.length}
        </span>
        <span className="flex-1 h-px bg-gray-100" />
      </p>

      {/* ── List ─────────────────────────────────────── */}
      {loading && <p className="text-xs text-gray-400">Loading…</p>}

      {!loading && comments.length === 0 && (
        <p className="text-sm text-gray-400 italic mb-5">No comments yet — start the conversation.</p>
      )}

      <div className="flex flex-col gap-4 mb-5">
        {comments.map(c => {
          const u = findUser(c.authorId)
          const isMe = c.authorId === CURRENT_USER_ID
          const isEdited = c.updatedAt !== c.createdAt
          return (
            <div key={c.id} className="flex items-start gap-3 group">
              {u && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: u.avatarColor }}
                >
                  {u.initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-700">{u?.name ?? 'Unknown'}</span>
                  <span className="text-xs text-gray-400">{fmtDate(c.createdAt)}</span>
                  {isEdited && <span className="text-xs text-gray-400 italic">· edited</span>}
                </div>

                {editing?.id === c.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editing.body}
                      onChange={e => setEditing({ id: c.id, body: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cr focus:ring-2 focus:ring-cr-pale resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 rounded-md bg-cr text-white font-semibold hover:opacity-90"
                        style={{ background: '#C0392B' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-cm-pale rounded-lg px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {c.body}
                  </div>
                )}
              </div>

              {isMe && editing?.id !== c.id && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditing({ id: c.id, body: c.body })}
                    className="p-1.5 text-xs rounded-md text-gray-400 hover:text-cr hover:bg-cr-pale"
                    title="Edit"
                  >✎</button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 text-xs rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete"
                  >🗑</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Composer ─────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          placeholder="Write a comment… (⌘+Enter to send)"
          maxLength={1000}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-cr focus:ring-2 focus:ring-cr-pale resize-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{draft.length}/1000</p>
          <button
            onClick={handleAdd}
            disabled={!draft.trim()}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#C0392B', boxShadow: '0 3px 12px rgba(192,57,43,0.3)' }}
          >
            Send →
          </button>
        </div>
        {error && (
          <p className={`text-xs ${error === 'offline' ? 'text-amber-600' : 'text-red-600'}`}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
