// Destination: together-app-ui/app/forgot-password/page.tsx
'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import FormInput from '@/components/ui/FormInput'
import { auth } from '@/lib/auth'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setErr(null)
    try {
      const r = await auth.recoverRequest(email)
      setSent(true)
      setDevCode(r.devCode ?? null)
    } catch (e) { setErr((e as Error).message) }
    finally     { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="w-full max-w-md">
        <h3 className="font-display text-3xl font-bold mb-1">Forgot your password?</h3>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email and we&apos;ll send you a 6-digit recovery code.
        </p>

        {err && <div className="mb-4 p-3 rounded bg-red-50 text-sm text-red-700">{err}</div>}

        {sent ? (
          <div className="p-4 rounded-lg bg-green-50 text-sm text-green-800">
            <p>If that email exists, a recovery code has been sent. 📬</p>
            {devCode && (
              <p className="mt-2 font-mono text-xs">Dev mode — code is <strong>{devCode}</strong></p>
            )}
            <Link href={`/reset-password?email=${encodeURIComponent(email)}`}
              className="block mt-3 text-cr font-semibold hover:underline">
              Enter the code →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormInput label="Email Address" id="email" name="email" type="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" error="" />
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold disabled:opacity-70"
              style={{ background: '#C0392B' }}>
              {loading ? 'Sending…' : 'Send recovery code →'}
            </button>
            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="text-cr hover:underline">← Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}