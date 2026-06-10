// Destination: together-app-ui/app/reset-password/page.tsx
'use client'
import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import FormInput from '@/components/ui/FormInput'
import { auth } from '@/lib/auth'

function Inner() {
  const router = useRouter()
  const params = useSearchParams()
  const [email,    setEmail]    = useState(params.get('email') ?? '')
  const [code,     setCode]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [err,      setErr]      = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setErr(null)
    if (password.length < 8)     return setErr('Password must be at least 8 characters')
    if (password !== confirm)    return setErr('Passwords do not match')
    if (!/^\d{6}$/.test(code))   return setErr('Code must be 6 digits')
    setLoading(true)
    try {
      await auth.recoverReset(email, code, password)
      setDone(true)
      setTimeout(() => router.push('/login'), 1500)
    } catch (e) { setErr((e as Error).message) }
    finally     { setLoading(false) }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="p-6 rounded-lg bg-green-50 text-green-800 text-center">
        ✅ Password updated. Redirecting to sign in…
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="w-full max-w-md">
        <h3 className="font-display text-3xl font-bold mb-1">Reset your password</h3>
        <p className="text-sm text-gray-500 mb-6">Enter the code we sent you and choose a new password.</p>

        {err && <div className="mb-4 p-3 rounded bg-red-50 text-sm text-red-700">{err}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormInput label="Email Address" id="email" name="email" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" error="" />
          <FormInput label="6-digit code" id="code" name="code" type="text"
            value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" error="" />
          <FormInput label="New Password" id="password" name="password" type="password"
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" error="" />
          <FormInput label="Confirm Password" id="confirm" name="confirm" type="password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" error="" />
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg text-white text-sm font-semibold disabled:opacity-70 bg-cr">
            {loading ? 'Resetting…' : 'Reset password →'}
          </button>
          <p className="text-center text-sm text-gray-500">
            <Link href="/login" className="text-cr hover:underline">← Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><Inner /></Suspense>
}