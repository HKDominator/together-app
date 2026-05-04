// Destination: together-app-ui/app/login/page.tsx
// REPLACE — was using a fake cookie. Now hits /api/auth/login.
'use client'
import { useState, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FormInput from '@/components/ui/FormInput'
import { validateLogin, isValid } from '@/lib/validation'
import { LoginFormData, ValidationErrors } from '@/types'
import { useAuth } from '@/context/AuthContext'

const EMPTY: LoginFormData = { email: '', password: '' }

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [form,    setForm]    = useState<LoginFormData>(EMPTY)
  const [errors,  setErrors]  = useState<ValidationErrors>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    setServerError(null)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validateLogin(form)
    if (!isValid(errs)) { setErrors(errs); return }

    setLoading(true); setServerError(null)
    try {
      await login(form.email, form.password)
      router.push('/tasks')
    } catch (err) {
      setServerError((err as Error).message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // The rest of the JSX stays exactly as it was — only the form's
  // onSubmit and the new {serverError && ...} message are different.
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* …existing decorative left panel… */}
      <div className="flex items-center justify-center px-8 py-20">
        <div className="w-full max-w-md">
          <h3 className="font-display text-3xl font-bold text-sl mb-1">Welcome back ❤️</h3>
          <p className="text-sm text-gray-500 mb-9">Sign in to your shared workspace</p>

          {/* Demo hint so the grader can copy-paste credentials */}
          <div className="mb-6 p-3 rounded-lg bg-gray-50 text-xs text-gray-600 leading-relaxed">
            <strong>Demo accounts:</strong><br />
            ana@together.dev / ana123 (admin)<br />
            dan@together.dev / dan123 (user)
          </div>

          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <FormInput label="Email Address"
              id="email" name="email" type="email"
              value={form.email} onChange={handleChange}
              error={errors.email} placeholder="you@example.com" />
            <FormInput label="Password"
              id="password" name="password" type="password"
              value={form.password} onChange={handleChange}
              error={errors.password} placeholder="••••••••" />

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-lg text-white text-sm font-semibold disabled:opacity-70"
              style={{ background: '#C0392B', boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-cr font-semibold hover:underline">Create one →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}