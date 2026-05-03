'use client'
import { useState, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FormInput from '@/components/ui/FormInput'
import { isValid } from '@/lib/validation'
import { ValidationErrors } from '@/types'
import Cookies from 'js-cookie'

interface Step1Data {
  firstName: string
  lastName:  string
  email:     string
  password:  string
  confirm:   string
}

interface Step2Data {
  workspaceName:  string
  partnerEmail:   string
}

type Step1Errors = Partial<Record<keyof Step1Data, string>>
type Step2Errors = Partial<Record<keyof Step2Data, string>>

const EMPTY1: Step1Data = { firstName: '', lastName: '', email: '', password: '', confirm: '' }
const EMPTY2: Step2Data = { workspaceName: '', partnerEmail: '' }

function validateStep1(data: Step1Data): Step1Errors {
  const errors: Step1Errors = {}
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!data.firstName.trim() || data.firstName.trim().length < 2) errors.firstName = 'First name must be at least 2 characters'
  if (!data.lastName.trim()  || data.lastName.trim().length  < 2) errors.lastName  = 'Last name must be at least 2 characters'
  if (!data.email || !EMAIL_RE.test(data.email))                  errors.email     = 'Please enter a valid email address'
  if (!data.password || data.password.length < 8)                 errors.password  = 'Password must be at least 8 characters'
  if (data.confirm !== data.password)                             errors.confirm   = 'Passwords do not match'
  return errors
}

function validateStep2(data: Step2Data): Step2Errors {
  const errors: Step2Errors = {}
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!data.workspaceName.trim() || data.workspaceName.trim().length < 2) errors.workspaceName = 'Workspace name must be at least 2 characters'
  if (data.partnerEmail && !EMAIL_RE.test(data.partnerEmail))             errors.partnerEmail  = 'Please enter a valid email address'
  return errors
}

export default function RegisterPage() {
  const router = useRouter()
  const [step,    setStep]    = useState<1 | 2>(1)
  const [form1,   setForm1]   = useState<Step1Data>(EMPTY1)
  const [form2,   setForm2]   = useState<Step2Data>(EMPTY2)
  const [errors1, setErrors1] = useState<Step1Errors>({})
  const [errors2, setErrors2] = useState<Step2Errors>({})
  const [loading, setLoading] = useState(false)

  function handleChange1(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm1(prev => ({ ...prev, [name]: value }))
    if (errors1[name as keyof Step1Data]) setErrors1(prev => ({ ...prev, [name]: '' }))
  }

  function handleChange2(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm2(prev => ({ ...prev, [name]: value }))
    if (errors2[name as keyof Step2Data]) setErrors2(prev => ({ ...prev, [name]: '' }))
  }

  function handleStep1(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validateStep1(form1)
    if (Object.keys(errs).length > 0) { setErrors1(errs); return }
    setStep(2)
  }

  function handleStep2(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validateStep2(form2)
    if (Object.keys(errs).length > 0) { setErrors2(errs); return }
    setLoading(true)
    // Simulate registration — set cookie and redirect
    Cookies.set('together_user', JSON.stringify({
      email: form1.email,
      name:  `${form1.firstName} ${form1.lastName}`,
      id:    'u1',
    }), { expires: 7 })
    Cookies.set('together_workspace', form2.workspaceName, { expires: 7 })
    Cookies.set('together_last_page', '/tasks', { expires: 7 })
    setTimeout(() => router.push('/tasks'), 600)
  }

  const leftTagline = step === 1
    ? 'Set up your shared workspace in under 2 minutes.'
    : `Almost there, ${form1.firstName || 'friend'} ✨`

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">

      {/* ── Left panel ─────────────────────────────── */}
      <div
        className="hidden md:flex flex-col items-center justify-center px-16 py-20 relative overflow-hidden"
        style={{ background: '#2C3E50' }}
      >
        <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(232,213,183,0.06)' }} />
        <div className="absolute bottom-[-40px] left-[-60px] w-[240px] h-[240px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(192,57,43,0.12)' }} />

        <div className="relative text-center">
          <svg width="60" height="60" viewBox="0 0 80 80" fill="none" className="mx-auto mb-6">
            <path d="M40 62C40 62 16 48 16 30C16 21.2 23.2 14 32 14C36.4 14 40.4 15.9 43 19C45.6 15.9 49.6 14 54 14C62.8 14 70 21.2 70 30C70 48 40 62 40 62Z" fill="#C0392B" />
          </svg>
          <h2 className="font-display text-4xl font-bold text-white mb-3">
            Start your<br /><em className="text-cm not-italic">Together</em> story
          </h2>
          <p className="text-sm font-light leading-relaxed tracking-wide"
            style={{ color: 'rgba(232,213,183,0.55)' }}>
            {leftTagline}
          </p>
        </div>

        <div className="relative mt-14 rounded-2xl p-7 max-w-sm w-full"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(232,213,183,0.1)' }}>
          <p className="text-sm leading-relaxed italic mb-4"
            style={{ color: 'rgba(232,213,183,0.6)' }}>
            &ldquo;We set it up during coffee on a Sunday. By lunch we had all our upcoming trips planned.&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div className="flex">
              <div className="w-7 h-7 rounded-full border-2 border-slate-700 -mr-2"
                style={{ background: 'linear-gradient(135deg,#C0392B,#E74C3C)' }} />
              <div className="w-7 h-7 rounded-full border-2 border-slate-700"
                style={{ background: 'linear-gradient(135deg,#2980B9,#3498DB)' }} />
            </div>
            <span className="text-xs" style={{ color: 'rgba(232,213,183,0.4)' }}>
              Irina &amp; Dan · 3 months on Together
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

          {/* Step indicator */}
          <div className="flex gap-2 mb-2">
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-cr' : 'bg-gray-200'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-cr' : 'bg-gray-200'}`} />
          </div>
          <p className="text-xs text-gray-400 mb-7">
            Step {step} of 2 — {step === 1 ? 'Your personal details' : 'Invite your partner'}
          </p>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <>
              <h3 className="font-display text-3xl font-bold text-sl mb-1">Create your account</h3>
              <p className="text-sm text-gray-500 mb-7">No credit card needed.</p>

              <form onSubmit={handleStep1} noValidate className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="First Name"
                    id="firstName"
                    name="firstName"
                    value={form1.firstName}
                    onChange={handleChange1}
                    error={errors1.firstName}
                    placeholder="Ana"
                  />
                  <FormInput
                    label="Last Name"
                    id="lastName"
                    name="lastName"
                    value={form1.lastName}
                    onChange={handleChange1}
                    error={errors1.lastName}
                    placeholder="Pop"
                  />
                </div>
                <FormInput
                  label="Email Address"
                  id="email"
                  name="email"
                  type="email"
                  value={form1.email}
                  onChange={handleChange1}
                  error={errors1.email}
                  placeholder="you@example.com"
                />
                <FormInput
                  label="Password"
                  id="password"
                  name="password"
                  type="password"
                  value={form1.password}
                  onChange={handleChange1}
                  error={errors1.password}
                  placeholder="Min. 8 characters"
                />
                <FormInput
                  label="Confirm Password"
                  id="confirm"
                  name="confirm"
                  type="password"
                  value={form1.confirm}
                  onChange={handleChange1}
                  error={errors1.confirm}
                  placeholder="Repeat your password"
                />
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-lg text-white text-sm font-semibold mt-1 transition-all hover:-translate-y-0.5"
                  style={{ background: '#C0392B', boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}
                >
                  Continue →
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-5">
                Already have an account?{' '}
                <Link href="/login" className="text-cr font-semibold hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <>
              <h3 className="font-display text-3xl font-bold text-sl mb-1">Set up your workspace</h3>
              <p className="text-sm text-gray-500 mb-7">Invite your partner to join.</p>

              <form onSubmit={handleStep2} noValidate className="flex flex-col gap-4">
                <FormInput
                  label="Workspace Name"
                  id="workspaceName"
                  name="workspaceName"
                  value={form2.workspaceName}
                  onChange={handleChange2}
                  error={errors2.workspaceName}
                  placeholder="e.g. Ana & Dan's Space"
                />
                <div className="flex flex-col gap-1.5">
                  <FormInput
                    label="Partner's Email"
                    id="partnerEmail"
                    name="partnerEmail"
                    type="email"
                    value={form2.partnerEmail}
                    onChange={handleChange2}
                    error={errors2.partnerEmail}
                    placeholder="partner@example.com"
                  />
                  <p className="text-xs text-gray-400">
                    We&apos;ll send them an invitation link. It expires after 72 hours.
                  </p>
                </div>

                {/* Share invite link box */}
                <div className="rounded-xl p-4 flex gap-3"
                  style={{ background: 'linear-gradient(135deg,rgba(192,57,43,0.06),rgba(232,213,183,0.2))', border: '1px solid rgba(192,57,43,0.15)' }}>
                  <span className="text-lg flex-shrink-0">🔗</span>
                  <p className="text-xs leading-relaxed text-gray-600">
                    <strong className="text-gray-800">Or share an invite link</strong><br />
                    Generate a one-time link your partner can use to join directly.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-lg text-white text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-70"
                  style={{ background: '#C0392B', boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}
                >
                  {loading ? 'Creating workspace…' : '🎉 Create Workspace & Invite Partner'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← Back to step 1
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
