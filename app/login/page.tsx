'use client'
import { useState, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FormInput from '@/components/ui/FormInput'
import { validateLogin, isValid } from '@/lib/validation'
import { LoginFormData, ValidationErrors } from '@/types'
import Cookies from 'js-cookie'

const EMPTY: LoginFormData = { email: '', password: '' }

export default function LoginPage() {
  const router = useRouter()
  const [form,    setForm]    = useState<LoginFormData>(EMPTY)
  const [errors,  setErrors]  = useState<ValidationErrors>({})
  const [loading, setLoading] = useState(false)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  function handleBlur(e: ChangeEvent<HTMLInputElement>) {
    const { name } = e.target
    const key = name as keyof ValidationErrors
    const errs = validateLogin(form)
    if (errs[key]) setErrors(prev => ({ ...prev, [key]: errs[key] }))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validateLogin(form)
    if (!isValid(errs)) { setErrors(errs); return }

    setLoading(true)
    // Simulate auth — set cookie and redirect
    Cookies.set('together_user', JSON.stringify({ email: form.email, name: 'Ana Pop', id: 'u1' }), { expires: 7 })
    Cookies.set('together_last_page', '/tasks', { expires: 7 })
    setTimeout(() => router.push('/tasks'), 600)
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">

      {/* ── Left panel ─────────────────────────────── */}
      <div
        className="hidden md:flex flex-col items-center justify-center px-16 py-20 relative overflow-hidden"
        style={{ background: '#2C3E50' }}
      >
        {/* Decorative rings */}
        <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(232,213,183,0.06)' }} />
        <div className="absolute bottom-[-40px] left-[-60px] w-[240px] h-[240px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(192,57,43,0.12)' }} />

        {/* Brand */}
        <div className="relative text-center">
          <svg width="60" height="60" viewBox="0 0 80 80" fill="none" className="mx-auto mb-6">
            <path d="M40 62C40 62 16 48 16 30C16 21.2 23.2 14 32 14C36.4 14 40.4 15.9 43 19C45.6 15.9 49.6 14 54 14C62.8 14 70 21.2 70 30C70 48 40 62 40 62Z" fill="#C0392B" />
          </svg>
          <h2 className="font-display text-4xl font-bold text-white mb-3">
            <em className="text-cm not-italic">Together</em>
          </h2>
          <p className="text-sm font-light leading-relaxed tracking-wide"
            style={{ color: 'rgba(232,213,183,0.55)' }}>
            Your shared space for planning<br />the life you&apos;re building together
          </p>
        </div>

        {/* Testimonial */}
        <div className="relative mt-14 rounded-2xl p-7 max-w-sm w-full"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(232,213,183,0.1)' }}>
          <p className="text-sm leading-relaxed italic mb-4"
            style={{ color: 'rgba(232,213,183,0.6)' }}>
            &ldquo;Finally an app that feels like it was made for us. We never miss anniversaries now.&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div className="flex">
              <div className="w-7 h-7 rounded-full border-2 border-slate-700 -mr-2"
                style={{ background: 'linear-gradient(135deg,#C0392B,#E74C3C)' }} />
              <div className="w-7 h-7 rounded-full border-2 border-slate-700"
                style={{ background: 'linear-gradient(135deg,#2980B9,#3498DB)' }} />
            </div>
            <span className="text-xs" style={{ color: 'rgba(232,213,183,0.4)' }}>
              Maria &amp; Alex · Together users
            </span>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────── */}
      <div className="flex flex-col items-center justify-center px-8 py-16 bg-cm-pale">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z" fill="#C0392B" />
            </svg>
            <span className="font-display text-xl font-bold text-sl"><em className="not-italic text-cr">Together</em></span>
          </div>

          <h3 className="font-display text-3xl font-bold text-sl mb-1">Welcome back ❤️</h3>
          <p className="text-sm text-gray-500 mb-9">Sign in to your shared workspace</p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <FormInput
              label="Email Address"
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              placeholder="you@example.com"
            />
            <FormInput
              label="Password"
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              placeholder="••••••••"
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                <input type="checkbox" className="accent-cr w-3.5 h-3.5" defaultChecked />
                Remember me
              </label>
              <span className="text-cr font-medium cursor-pointer hover:underline text-xs">Forgot password?</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg text-white text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ background: '#C0392B', boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>

            <div className="flex items-center gap-3">
              <span className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or continue with</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => {
                Cookies.set('together_user', JSON.stringify({ email: 'google@user.com', name: 'Ana Pop', id: 'u1' }), { expires: 7 })
                router.push('/tasks')
              }}
              className="w-full py-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              🔗 Sign in with Google
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-cr font-semibold hover:underline">Create one →</Link>
          </p>

          {/* Invite box */}
          <div className="mt-7 rounded-xl p-4 flex gap-3"
            style={{ background: 'linear-gradient(135deg,rgba(192,57,43,0.06),rgba(232,213,183,0.2))', border: '1px solid rgba(192,57,43,0.15)' }}>
            <span className="text-lg flex-shrink-0">💌</span>
            <p className="text-xs leading-relaxed text-gray-600">
              <strong className="text-gray-800">Got an invite?</strong><br />
              Your partner can share an invitation link — check your email or ask them for the code.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
