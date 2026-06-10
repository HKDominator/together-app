// Destination: together-app-ui/app/login/page.tsx
// REPLACE — multi-step: password → OTP → PIN. The page re-uses the
// existing FormInput component and the same visual treatment.
'use client'
import { useState, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FormInput from '@/components/ui/FormInput'
import { useAuth } from '@/context/AuthContext'

type Step = 'password' | 'otp' | 'pin'

export default function LoginPage() {
  const router    = useRouter()
  const { login, verifyOtp, verifyPin, hydrate } = useAuth()
  const [step, setStep] = useState<Step>('password')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [otp,      setOtp]      = useState('')
  const [pin,      setPin]      = useState('')
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [devOtp,    setDevOtp]    = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)

  async function handlePassword(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const r = await login(email, password)
      if (r.stage === 'otp') {
        setAttemptId(r.attemptId)
        setDevOtp(r.devOtp ?? null)
        setStep('otp')
      } else if (r.stage === 'done') {
        await hydrate()
        router.push('/tasks')
      }
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  async function handleOtp(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const r = await verifyOtp(attemptId!, otp)
      if (r.stage === 'pin') {
        setAttemptId(r.attemptId)
        setStep('pin')
      } else if (r.stage === 'done') {
        await hydrate()
        router.push('/tasks')
      }
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  async function handlePin(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      await verifyPin(attemptId!, pin)
      await hydrate()
      router.push('/tasks')
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="bg-gradient-to-br from-rose-50 to-amber-50 hidden md:flex items-center justify-center" />
      <div className="flex items-center justify-center px-8 py-20">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-bold mb-1">Welcome back ❤️</h1>
          <p className="text-sm text-gray-500 mb-6">Sign in to your shared workspace</p>

          {/* SEC-07: the seeded demo credentials (real admin account + PIN) were
              printed here and shipped in the client bundle — removed so they are
              no longer handed to every visitor. */}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
          )}

          {step === 'password' && (
            <form onSubmit={handlePassword} className="flex flex-col gap-4">
              <FormInput label="Email Address" id="email" name="email" type="email"
                value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="you@example.com" error="" />
              <FormInput label="Password" id="password" name="password" type="password"
                value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="••••••••" error="" />
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg text-white text-sm font-semibold disabled:opacity-70 bg-cr">
                {loading ? 'Signing in…' : 'Continue →'}
              </button>
              <div className="text-center text-xs text-gray-500 mt-1">
                <Link href="/forgot-password" className="text-cr hover:underline">Forgot password?</Link>
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-cr font-semibold hover:underline">Create one →</Link>
              </p>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtp} className="flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                We sent a 6-digit code to <strong>{email}</strong>.
              </p>
              {devOtp && (
                <div className="p-2 rounded bg-amber-50 text-xs text-amber-800 font-mono">
                  Dev mode — code is <strong>{devOtp}</strong>
                </div>
              )}
              <FormInput label="Verification code" id="otp" name="otp" type="text"
                value={otp} onChange={(e: ChangeEvent<HTMLInputElement>) => setOtp(e.target.value)}
                placeholder="123456" error="" />
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg text-white text-sm font-semibold disabled:opacity-70 bg-cr">
                {loading ? 'Verifying…' : 'Verify →'}
              </button>
              <button type="button" onClick={() => setStep('password')}
                className="text-xs text-gray-500 hover:text-gray-700">← Back</button>
            </form>
          )}

          {step === 'pin' && (
            <form onSubmit={handlePin} className="flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                Final step — enter your security PIN.
              </p>
              <FormInput label="Security PIN" id="pin" name="pin" type="password"
                value={pin} onChange={(e: ChangeEvent<HTMLInputElement>) => setPin(e.target.value)}
                placeholder="••••" error="" />
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg text-white text-sm font-semibold disabled:opacity-70 bg-cr">
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}