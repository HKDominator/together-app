'use client'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="p-8 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">Account</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-800 font-medium">Profile</span>
      </div>

      <h1 className="font-display text-2xl font-bold text-gray-800 mb-1">Profile</h1>
      <p className="text-xs text-gray-500 mb-8">Your display name and avatar</p>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold"
            style={{ background: (user as { avatarColor?: string } | null)?.avatarColor ?? '#c0392b' }}
          >
            {(user?.name ?? 'U').split(' ').map((s: string) => s[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user?.name ?? 'You'}</p>
            <p className="text-xs text-gray-400">Display name</p>
          </div>
        </div>
        <p className="text-sm text-gray-400">Profile editing will be available in a future update.</p>
      </div>
    </div>
  )
}
