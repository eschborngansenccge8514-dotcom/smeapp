import { AuthPanel } from '@/components/auth/AuthPanel'
import { SignUpForm } from '@/components/auth/SignUpForm'

export const metadata = { title: 'Create Account' }

export default function RegisterPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthPanel mode="signup" />
      <div className="flex items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        <SignUpForm />
      </div>
    </div>
  )
}
