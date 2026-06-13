'use client'
import Link from 'next/link'

export default function SecurityPage() {
  return (
    <div className="p-8 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">Account</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-800 font-medium">Security</span>
      </div>

      <h1 className="font-display text-2xl font-bold text-gray-800 mb-1">Security</h1>
      <p className="text-xs text-gray-500 mb-8">Password and PIN management</p>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Change password</h2>
          <p className="text-xs text-gray-500 mb-4">
            Use the password recovery flow to set a new password.
          </p>
          <Link
            href="/forgot-password"
            className="text-sm text-cr font-semibold hover:underline"
          >
            Start password recovery →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Security PIN</h2>
          <p className="text-xs text-gray-500">
            PIN management will be available in a future update. You can set a PIN during registration.
          </p>
        </div>
      </div>
    </div>
  )
}
