'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface FieldError {
  fullName?: string
  email?: string
  password?: string
  confirm?: string
}

export function SignUpForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldError>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [done, setDone] = useState(false)

  const passwordStrength = (() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength]
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][passwordStrength]

  function validate(): FieldError {
    const errors: FieldError = {}
    if (!fullName.trim()) errors.fullName = 'Full name is required'
    else if (fullName.trim().length < 2) errors.fullName = 'Name must be at least 2 characters'
    if (!email) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address'
    if (!password) errors.password = 'Password is required'
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters'
    if (!confirm) errors.confirm = 'Please confirm your password'
    else if (confirm !== password) errors.confirm = 'Passwords do not match'
    return errors
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
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    setServerError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim() } },
    })

    if (error) {
      setServerError(
        error.message.includes('already registered')
          ? 'This email is already registered. Try signing in instead.'
          : error.message
      )
      setLoading(false)
      return
    }
    setDone(true)
  }

  const inputClass = (field: keyof FieldError) =>
    `w-full border rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
      touched[field] && fieldErrors[field as keyof FieldError]
        ? 'border-red-400 focus:ring-red-300 bg-red-50'
        : touched[field] && !fieldErrors[field as keyof FieldError] && (field === 'fullName' ? fullName : field === 'email' ? email : field === 'password' ? password : confirm)
        ? 'border-green-400 focus:ring-green-300 bg-green-50/30'
        : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-400 bg-white'
    }`

  if (done) return (
    <div className="w-full max-w-md mx-auto text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
        ✅
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email!</h2>
      <p className="text-gray-500 mb-2">
        We sent a confirmation link to
      </p>
      <p className="font-semibold text-gray-800 mb-6">{email}</p>
      <p className="text-sm text-gray-400 mb-8">
        Click the link in the email to verify your account. Check your spam folder if you don't see it within a minute.
      </p>
      <Link
        href="/login"
        className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
      >
        Back to Sign In
      </Link>
    </div>
  )

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create account</h1>
        <p className="text-gray-500 mt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      {serverError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <p>{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
          <input
            type="text"
            autoComplete="name"
            placeholder="Ali bin Ahmad"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); if (touched.fullName) setFieldErrors(validate()) }}
            onBlur={() => handleBlur('fullName')}
            className={inputClass('fullName')}
          />
          {touched.fullName && fieldErrors.fullName && (
            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{fieldErrors.fullName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="ali@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (touched.email) setFieldErrors(validate()) }}
            onBlur={() => handleBlur('email')}
            className={inputClass('email')}
          />
          {touched.email && fieldErrors.email && (
            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (touched.password) setFieldErrors(validate()) }}
              onBlur={() => handleBlur('password')}
              className={`${inputClass('password')} pr-12`}
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-lg" tabIndex={-1}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {/* Password strength bar */}
          {password && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= passwordStrength ? strengthColor : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className={`text-xs font-medium ${['', 'text-red-500', 'text-yellow-600', 'text-blue-600', 'text-green-600'][passwordStrength]}`}>
                {strengthLabel} password
              </p>
            </div>
          )}
          {touched.password && fieldErrors.password && (
            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{fieldErrors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); if (touched.confirm) setFieldErrors(validate()) }}
              onBlur={() => handleBlur('confirm')}
              className={`${inputClass('confirm')} pr-12`}
            />
            <button type="button" onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-lg" tabIndex={-1}>
              {showConfirm ? '🙈' : '👁️'}
            </button>
            {touched.confirm && !fieldErrors.confirm && confirm && (
              <span className="absolute right-11 top-1/2 -translate-y-1/2 text-green-500">✓</span>
            )}
          </div>
          {touched.confirm && fieldErrors.confirm && (
            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{fieldErrors.confirm}</p>
          )}
        </div>

        {/* T&C */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input type="checkbox" required className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-indigo-600 shrink-0" />
          <span className="text-sm text-gray-600">
            I agree to the{' '}
            <a href="/terms" className="text-indigo-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</a>
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating account…
            </>
          ) : (
            'Create my account'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={async () => {
          const supabase = createClient()
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          })
        }}
        className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign up with Google
      </button>
    </div>
  )
}
