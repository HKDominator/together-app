'use client'
import Link from 'next/link'

export default function AccountPage() {
  return (
    <div className="p-9">
      <h1 className="font-display text-3xl font-bold text-gray-800 mb-1">Account</h1>
      <p className="text-xs text-gray-500 mb-8">Manage your profile and settings</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link
          href="/account/sessions"
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:border-gray-200 hover:shadow-md transition-all group"
        >
          <div className="text-2xl mb-3">🔑</div>
          <h2 className="font-semibold text-gray-800 mb-1 group-hover:text-cr transition-colors">Sessions</h2>
          <p className="text-xs text-gray-500">Manage your active login sessions and revoke access</p>
        </Link>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 opacity-50 cursor-not-allowed select-none">
          <div className="text-2xl mb-3">👤</div>
          <h2 className="font-semibold text-gray-800 mb-1">Profile</h2>
          <p className="text-xs text-gray-500">Display name and avatar colour — coming soon</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 opacity-50 cursor-not-allowed select-none">
          <div className="text-2xl mb-3">🔒</div>
          <h2 className="font-semibold text-gray-800 mb-1">Security</h2>
          <p className="text-xs text-gray-500">Password and PIN management — coming soon</p>
        </div>
      </div>
    </div>
  )
}
