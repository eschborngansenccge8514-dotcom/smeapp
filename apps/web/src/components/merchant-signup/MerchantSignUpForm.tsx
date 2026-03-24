'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface FieldError {
  fullName?: string; email?: string; password?: string; confirm?: string
}

export function MerchantSignUpForm() {
  const router = useRouter()
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showCf, setShowCf]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [serverError, setServerError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldError>({})
  const [touched, setTouched]     = useState<Record<string, boolean>>({})

  const strength = (() => {
    let s = 0
    if (password.length >= 8)      s++
    if (/[A-Z]/.test(password))    s++
    if (/[0-9]/.test(password))    s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  })()

  function validate(): FieldError {
    const e: FieldError = {}
    if (!fullName.trim())        e.fullName = 'Full name is required'
    if (!email)                  e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email'
    if (!password)               e.password = 'Password is required'
    else if (password.length < 8) e.password = 'Minimum 8 characters'
    if (!confirm)                e.confirm = 'Please confirm your password'
    else if (confirm !== password) e.confirm = 'Passwords do not match'
    return e
  }

  function handleBlur(field: string) {
    setTouched((p) => ({ ...p, [field]: true }))
    setFieldErrors(validate())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ fullName: true, email: true, password: true, confirm: true })
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    setLoading(true); setServerError('')
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName.trim(), role: 'merchant' },
        emailRedirectTo: `${window.location.origin}/onboarding/step-1`,
      },
    })

    if (error) {
      setServerError(
        error.message.includes('already registered')
          ? 'This email is already registered.'
          : error.message
      )
      setLoading(false)
      return
    }

    // Auto sign-in (Supabase confirms immediately in dev / if email confirm disabled)
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (!signInErr) {
      router.push('/onboarding/step-1')
      router.refresh()
    } else {
      // Email confirm required — redirect to check-email screen
      router.push('/merchant-signup/check-email?email=' + encodeURIComponent(email))
    }
  }

  const inputClass = (f: keyof FieldError) =>
    `w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
      touched[f] && fieldErrors[f]
        ? 'border-red-400 focus:ring-red-300 bg-red-50 text-gray-900'
        : touched[f] && !fieldErrors[f]
        ? 'border-green-400 focus:ring-green-300 bg-green-50/30 text-gray-900'
        : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-400 bg-white text-gray-900'
    }`

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          🏪 Merchant Account
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Open your store</h1>
        <p className="text-gray-500 mt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>

      {serverError && (
        <div className="flex gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
          <span className="shrink-0 mt-0.5">⚠️</span><p>{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
          <input type="text" autoComplete="name" placeholder="Ali bin Ahmad"
            value={fullName} onBlur={() => handleBlur('fullName')}
            onChange={(e) => { setFullName(e.target.value); if (touched.fullName) setFieldErrors(validate()) }}
            className={inputClass('fullName')} />
          {touched.fullName && fieldErrors.fullName && (
            <p className="text-red-500 text-xs mt-1.5">⚠ {fieldErrors.fullName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Business email</label>
          <input type="email" autoComplete="email" placeholder="ali@mybusiness.com"
            value={email} onBlur={() => handleBlur('email')}
            onChange={(e) => { setEmail(e.target.value); if (touched.email) setFieldErrors(validate()) }}
            className={inputClass('email')} />
          {touched.email && fieldErrors.email && (
            <p className="text-red-500 text-xs mt-1.5">⚠ {fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} autoComplete="new-password"
              placeholder="Min. 8 characters" value={password}
              onBlur={() => handleBlur('password')}
              onChange={(e) => { setPassword(e.target.value); if (touched.password) setFieldErrors(validate()) }}
              className={`${inputClass('password')} pr-12`} />
            <button type="button" tabIndex={-1} onClick={() => setShowPw((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          {password && (
            <div className="mt-2 flex gap-1">
              {[1,2,3,4].map((i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= strength
                    ? ['','bg-red-400','bg-yellow-400','bg-blue-400','bg-green-500'][strength]
                    : 'bg-gray-200'
                }`} />
              ))}
            </div>
          )}
          {touched.password && fieldErrors.password && (
            <p className="text-red-500 text-xs mt-1.5">⚠ {fieldErrors.password}</p>
          )}
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
          <div className="relative">
            <input type={showCf ? 'text' : 'password'} autoComplete="new-password"
              placeholder="Repeat your password" value={confirm}
              onBlur={() => handleBlur('confirm')}
              onChange={(e) => { setConfirm(e.target.value); if (touched.confirm) setFieldErrors(validate()) }}
              className={`${inputClass('confirm')} pr-12`} />
            <button type="button" tabIndex={-1} onClick={() => setShowCf((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">
              {showCf ? '🙈' : '👁️'}
            </button>
            {touched.confirm && !fieldErrors.confirm && confirm && (
              <span className="absolute right-11 top-1/2 -translate-y-1/2 text-green-500 font-bold">✓</span>
            )}
          </div>
          {touched.confirm && fieldErrors.confirm && (
            <p className="text-red-500 text-xs mt-1.5">⚠ {fieldErrors.confirm}</p>
          )}
        </div>

        {/* T&C */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input type="checkbox" required className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-indigo-600 shrink-0" />
          <span className="text-sm text-gray-600">
            I agree to the{' '}
            <a href="/terms" className="text-indigo-600 hover:underline">Merchant Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</a>
          </span>
        </label>

        <button type="submit" disabled={loading}
          className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-indigo-200">
          {loading ? (
            <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>Creating account…</>
          ) : 'Create merchant account →'}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-6">
        Looking to shop instead?{' '}
        <Link href="/register" className="text-indigo-600 hover:underline">Create a customer account</Link>
      </p>
    </div>
  )
}
