'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export function EinvoiceSettingsForm({ store }: { store: any }) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [form, setForm] = useState({
    tin: store?.tin ?? '',
    brn: store?.brn ?? '',
    msic_code: store?.msic_code ?? '47910',
    business_activity_desc: store?.business_activity_desc ?? 'RETAIL SALE OF ANY KIND OF PRODUCT OVER THE INTERNET',
    invoice_email: store?.invoice_email ?? '',
    invoice_phone: store?.invoice_phone ?? '',
    invoice_address: store?.invoice_address ?? '',
    invoice_city: store?.invoice_city ?? '',
    invoice_state_code: store?.invoice_state_code ?? '14',
    invoice_postcode: store?.invoice_postcode ?? '',
    lhdn_client_id: store?.lhdn_client_id ?? '',
    lhdn_client_secret: store?.lhdn_client_secret ?? '',
    cert_p12_base64: store?.cert_p12_base64 ?? '',
    cert_passphrase: store?.cert_passphrase ?? '',
  })
  const [loading, setLoading] = useState(false)

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    setLoading(true)
    const { error } = await supabase
      .from('stores')
      .update(form)
      .eq('id', store.id)
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('e-Invoice settings saved')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-indigo-600">LHDN API Credentials</h3>
        <p className="text-xs text-gray-400 mb-4 font-bold uppercase tracking-wider">
          Provide your unique Sandbox/Production Client ID and Secret obtained from the LHDN MyInvois Portal.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="LHDN Client ID" value={form.lhdn_client_id} onChange={(v: string) => update('lhdn_client_id', v)} placeholder="Your Client ID" />
          <Field label="LHDN Client Secret" value={form.lhdn_client_secret} onChange={(v: string) => update('lhdn_client_secret', v)} placeholder="Your Client Secret" type="password" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-indigo-600">Digital Certificate (.p12)</h3>
        <p className="text-xs text-gray-400 mb-4 font-bold uppercase tracking-wider">
          Upload your MyInvois digital certificate for secure signing.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Certificate File</label>
            <input type="file" accept=".p12" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const base64 = (ev.target?.result as string).split(',')[1]
                  update('cert_p12_base64', base64)
                  toast.success('Certificate loaded')
                }
                reader.readAsDataURL(file)
              }
            }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all" />
            {form.cert_p12_base64 && <span className="text-[10px] text-green-600 font-bold">✓ Certificate uploaded</span>}
          </div>
          <Field label="Certificate Passphrase" value={form.cert_passphrase} onChange={(v: string) => update('cert_passphrase', v)} placeholder="Passphrase" type="password" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-indigo-600">Business Registration</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tax Identification Number (TIN)" value={form.tin} onChange={(v: string) => update('tin', v)} placeholder="e.g. C1234567890" />
          <Field label="Business Registration Number (BRN)" value={form.brn} onChange={(v: string) => update('brn', v)} placeholder="e.g. 202001012345" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-indigo-600">Industry Classification</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="MSIC Code" value={form.msic_code} onChange={(v: string) => update('msic_code', v)} placeholder="e.g. 47910" />
          <Field label="Business Activity Description" value={form.business_activity_desc} onChange={(v: string) => update('business_activity_desc', v)} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-indigo-600">Invoice Contact Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Invoice Email" value={form.invoice_email} onChange={(v: string) => update('invoice_email', v)} placeholder="e.g. billing@company.com" />
          <Field label="Invoice Phone" value={form.invoice_phone} onChange={(v: string) => update('invoice_phone', v)} placeholder="e.g. +60312345678" />
        </div>
        <div className="mt-4">
          <Field label="Invoice Address" value={form.invoice_address} onChange={(v: string) => update('invoice_address', v)} multiline />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Field label="City" value={form.invoice_city} onChange={(v: string) => update('invoice_city', v)} />
          <Field label="State Code" value={form.invoice_state_code} onChange={(v: string) => update('invoice_state_code', v)} placeholder="e.g. 14 for KL" />
          <Field label="Postcode" value={form.invoice_postcode} onChange={(v: string) => update('invoice_postcode', v)} />
        </div>
      </div>

      <button onClick={save} disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md">
        {loading ? 'Saving...' : 'Save e-Invoice Configuration'}
      </button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, multiline = false, type = "text" }: any) {
  const props = { value, onChange: (e: any) => onChange(e.target.value), placeholder, type,
    className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all' }
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {multiline ? <textarea {...props} rows={3} className={props.className + ' resize-none'} />
        : <input {...props} />}
    </div>
  )
}
