'use client'
import { useState, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FormInput from '@/components/ui/FormInput'
import { useAuth } from '@/context/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const router = useRouter()
  const { register, hydrate } = useAuth()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '', securityPin: '',
  })
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [serverError,  setServerError]  = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    setServerError(null)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 2)       e.name     = 'Name must be at least 2 characters'
    if (!EMAIL_RE.test(form.email))        e.email    = 'Please enter a valid email'
    if (form.password.length < 8)          e.password = 'Password must be at least 8 characters'
    if (form.confirm !== form.password)    e.confirm  = 'Passwords do not match'
    if (form.securityPin && !/^\d{4,6}$/.test(form.securityPin))
      e.securityPin = 'PIN must be 4–6 digits'
    return e
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true); setServerError(null)
    try {
      await register({
        email:       form.email.trim(),
        password:    form.password,
        name:        form.name.trim(),
        securityPin: form.securityPin || undefined,
      })
      await hydrate()
      router.push('/tasks')
    } catch (err) {
      setServerError((err as Error).message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="bg-gradient-to-br from-rose-50 to-amber-50 hidden md:block" />
      <div className="flex items-center justify-center px-8 py-20">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-bold mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">Start your shared space together.</p>

          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-700">{serverError}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <FormInput label="Full Name" id="name" name="name" type="text"
              value={form.name} onChange={handleChange} error={errors.name} placeholder="Ana Pop" />
            <FormInput label="Email Address" id="email" name="email" type="email"
              value={form.email} onChange={handleChange} error={errors.email} placeholder="you@example.com" />
            <FormInput label="Password" id="password" name="password" type="password"
              value={form.password} onChange={handleChange} error={errors.password} placeholder="Min. 8 characters" />
            <FormInput label="Confirm Password" id="confirm" name="confirm" type="password"
              value={form.confirm} onChange={handleChange} error={errors.confirm} placeholder="Repeat your password" />

            {/* PIN is hidden by default — casual users never see it; power users expand Advanced */}
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                aria-expanded={showAdvanced}
                className="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50 motion-safe:transition-colors"
              >
                <span className="font-medium">Advanced</span>
                <span
                  className="text-gray-400 text-xs motion-safe:transition-transform motion-safe:duration-150"
                  style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▾
                </span>
              </button>

              {showAdvanced && (
                <div className="px-4 pb-4 pt-1 flex flex-col gap-3 bg-gray-50">
                  <p className="text-xs text-gray-500">
                    Add a PIN for extra sign-in security. You&apos;ll enter this 4–6 digit number
                    each time you sign in, after your password and email code.
                  </p>
                  <FormInput
                    label="Security PIN"
                    id="securityPin"
                    name="securityPin"
                    type="password"
                    value={form.securityPin}
                    onChange={handleChange}
                    error={errors.securityPin}
                    placeholder="4–6 digits (optional)"
                  />
                </div>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold disabled:opacity-70 mt-2 bg-cr">
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-cr font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
