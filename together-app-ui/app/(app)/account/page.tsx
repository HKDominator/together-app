'use client'
import Link from 'next/link'

const SECTIONS = [
  {
    href:        '/account/sessions',
    icon:        '🔑',
    label:       'Sessions',
    description: 'Manage your active sign-in sessions and revoke access',
  },
  {
    href:        '/account/profile',
    icon:        '👤',
    label:       'Profile',
    description: 'Display name and avatar colour',
  },
  {
    href:        '/account/security',
    icon:        '🔒',
    label:       'Security',
    description: 'Password and PIN management',
  },
]

export default function AccountPage() {
  return (
    <div className="p-9">
      <h1 className="font-display text-3xl font-bold text-gray-800 mb-1">Account</h1>
      <p className="text-xs text-gray-500 mb-8">Manage your profile and settings</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {SECTIONS.map(({ href, icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:border-gray-200 hover:shadow-md motion-safe:transition-all group"
          >
            <div className="text-2xl mb-3">{icon}</div>
            <h2 className="font-semibold text-gray-800 mb-1 group-hover:text-cr motion-safe:transition-colors">
              {label}
            </h2>
            <p className="text-xs text-gray-500">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
