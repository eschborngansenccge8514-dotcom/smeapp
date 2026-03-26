'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { updateProfile, uploadAvatar, changePassword } from '@/lib/actions/profile'
import { useRouter } from 'next/navigation'

export function ProfileForm({ profile }: { profile: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    date_of_birth: profile?.date_of_birth || '',
    gender: profile?.gender || 'prefer_not_to_say',
  })

  const [passData, setPassData] = useState({
    current: '',
    newPass: '',
    confirm: '',
  })

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await updateProfile(formData)
      setSuccess('Profile updated successfully!')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAvatarClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      await uploadAvatar(file)
      setSuccess('Avatar updated!')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (passData.newPass !== passData.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await changePassword(passData.current, passData.newPass)
      setSuccess('Password changed successfully!')
      setPassData({ current: '', newPass: '', confirm: '' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-10 divide-y divide-gray-50">
      {/* Avatar Section */}
      <section className="flex flex-col sm:flex-row items-center gap-6 pb-10">
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 ring-4 ring-indigo-50">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt="Avatar" fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-indigo-300 font-bold bg-indigo-50">
              {formData.full_name.charAt(0) || 'U'}
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          <button
            onClick={handleAvatarClick}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            Change Photo
          </button>
          <p className="text-xs text-gray-400 mt-2">JPG, GIF or PNG. Max size of 2MB.</p>
        </div>
      </section>

      {/* Profile Form */}
      <section className="pt-10">
        <h2 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-1 h-4 bg-indigo-600 rounded-full" />
          Personal Information
        </h2>
        <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 transition-all font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 transition-all font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1">Date of Birth</label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 transition-all font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 transition-all font-medium"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          
          <div className="sm:col-span-2 pt-2">
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                ✅ {success}
              </div>
            )}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                ⚠️ {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>

      {/* Password Section */}
      <section className="pt-10">
        <h2 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-1 h-4 bg-indigo-600 rounded-full" />
          Change Password
        </h2>
        <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1">New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={passData.newPass}
              onChange={(e) => setPassData({ ...passData, newPass: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1">Confirm New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={passData.confirm}
              onChange={(e) => setPassData({ ...passData, confirm: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !passData.newPass}
            className="px-6 py-3 bg-white border border-gray-200 text-gray-900 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]"
          >
            Update Password
          </button>
        </form>
      </section>
    </div>
  )
}
