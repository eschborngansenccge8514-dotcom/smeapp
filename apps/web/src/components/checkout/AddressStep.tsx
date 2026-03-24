'use client'
import { useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { MapPin, Plus, Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const LABELS = ['Home', 'Office', 'Other']

export function AddressStep({ addresses, selected, onSelect, onNext, userId }: any) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [showNewForm, setShowNewForm] = useState(addresses.length === 0)
  const [form, setForm] = useState({
    label: 'Home', recipient: '', phone: '',
    address_line: '', city: '', state: 'Kuala Lumpur', postcode: '',
  })
  const [saving, setSaving] = useState(false)

  async function saveAddress() {
    if (!form.recipient || !form.phone || !form.address_line || !form.postcode) {
      toast.error('Please fill in all required fields')
      return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from('addresses')
      .insert({ ...form, customer_id: userId, is_default: addresses.length === 0 })
      .select()
      .single()
    if (error) {
      toast.error(error.message)
    } else {
      onSelect(data)
      setShowNewForm(false)
      toast.success('Address saved')
      router.refresh()
    }
    setSaving(false)
  }

  function up(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const STATES = ['Kuala Lumpur','Selangor','Johor','Penang','Perak','Sabah','Sarawak','Kedah','Kelantan','Terengganu','Pahang','Negeri Sembilan','Melaka','Perlis','Putrajaya','Labuan']

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
      <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
        <MapPin size={20} className="text-indigo-500" /> Delivery Address
      </h2>

      {/* Existing addresses */}
      <div className="space-y-3">
        {addresses.map((addr: any) => (
          <button key={addr.id} onClick={() => { onSelect(addr); setShowNewForm(false) }}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-colors
              ${selected?.id === addr.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    {addr.label}
                  </span>
                  {addr.is_default && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Default</span>
                  )}
                </div>
                <p className="font-semibold text-gray-900">{addr.recipient}</p>
                <p className="text-sm text-gray-500">{addr.phone}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {addr.address_line}, {addr.city}, {addr.state} {addr.postcode}
                </p>
              </div>
              {selected?.id === addr.id && (
                <Check size={20} className="text-indigo-600 shrink-0 mt-1" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* New address form */}
      {showNewForm ? (
        <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-gray-800">New Address</p>
          <div className="flex gap-2">
            {LABELS.map((l) => (
              <button key={l} onClick={() => up('label', l)}
                type="button"
                className={`flex-1 px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-colors
                  ${form.label === l ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Recipient Name *" value={form.recipient} onChange={(v: string) => up('recipient', v)} />
            <Input label="Phone *" value={form.phone} onChange={(v: string) => up('phone', v)} />
          </div>
          <Input label="Address *" value={form.address_line} onChange={(v: string) => up('address_line', v)}
            placeholder="No. 12, Jalan Mawar" />
          <div className="grid grid-cols-3 gap-3">
            <Input label="City *" value={form.city} onChange={(v: string) => up('city', v)} placeholder="Cheras" />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">State *</label>
              <select value={form.state} onChange={(e) => up('state', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <Input label="Postcode *" value={form.postcode} onChange={(v: string) => up('postcode', v)} placeholder="56000" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={saveAddress} disabled={saving}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Address'}
            </button>
            {addresses.length > 0 && (
              <button onClick={() => setShowNewForm(false)}
                className="px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          <Plus size={15} /> Add new address
        </button>
      )}

      <button
        onClick={onNext}
        disabled={!selected}
        className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        Continue to Delivery →
      </button>
    </div>
  )
}

function Input({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
    </div>
  )
}
