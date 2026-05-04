// Destination: together-app-ui/app/(app)/admin/users/page.tsx
// NEW. Shows the gated endpoint working. Non-admins see an empty
// permission-denied panel instead of the user table.
'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/api'

interface AdminUser {
  id: string; email: string; name: string; role: string
  authRoles: string[]; createdAt: string
}

export default function AdminUsersPage() {
  const { user, hasPermission, loading } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!hasPermission('user.manage')) return
    fetch(`${API_URL}/admin/users`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setUsers)
      .catch(e => setError(e.message))
  }, [loading, hasPermission])

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>

  if (!user) {
    return <div className="p-8 text-gray-500">Please sign in.</div>
  }

  if (!hasPermission('user.manage')) {
    return (
      <div className="p-8">
        <h1 className="font-display text-2xl font-bold text-sl mb-2">Admin · Users</h1>
        <div className="p-6 rounded-xl bg-amber-50 text-amber-800 text-sm">
          🔒 You don&apos;t have permission to view this page.<br />
          Required permission: <code>user.manage</code> (admin role only).
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold text-sl mb-6">Admin · Users</h1>
      {error && <div className="p-4 mb-4 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
      <table className="w-full text-sm bg-white rounded-xl shadow-sm overflow-hidden">
        <thead className="bg-gray-50 text-left text-gray-500 text-xs uppercase">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Workspace role</th>
            <th className="px-4 py-3">Auth roles</th>
            <th className="px-4 py-3">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-t border-gray-100">
              <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
              <td className="px-4 py-3 text-gray-600">{u.email}</td>
              <td className="px-4 py-3 text-gray-600">{u.role}</td>
              <td className="px-4 py-3">
                {u.authRoles.map(r => (
                  <span key={r} className={`mr-1 px-2 py-0.5 rounded text-xs ${
                    r === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>{r}</span>
                ))}
              </td>
              <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}