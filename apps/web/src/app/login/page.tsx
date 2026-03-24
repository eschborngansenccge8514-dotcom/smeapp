import { Suspense } from 'react'
import { AuthPanel } from '@/components/auth/AuthPanel'
import { SignInForm } from '@/components/auth/SignInForm'

export const metadata = { title: 'Sign In' }

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthPanel mode="signin" />
      <div className="flex items-center justify-center px-6 py-12 bg-white">
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  )
}
