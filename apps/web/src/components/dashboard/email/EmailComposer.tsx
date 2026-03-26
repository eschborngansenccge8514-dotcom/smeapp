'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmailTemplateLibrary } from './EmailTemplateLibrary'

interface Props {
  storeId: string
  primaryColor: string
  storeName: string
  storeEmail: string
  onSaved: () => void
}

const PERSONALIZATION_TAGS = [
  { tag: '{{name}}',        label: 'Customer Name' },
  { tag: '{{email}}',       label: 'Customer Email' },
  { tag: '{{store_name}}',  label: 'Store Name' },
  { tag: '{{unsubscribe}}', label: 'Unsubscribe Link' },
]

export function EmailComposer({ storeId, primaryColor, storeName, storeEmail, onSaved }: Props) {
  const [name, setName]           = useState('')
  const [subject, setSubject]     = useState('')
  const [previewText, setPreview] = useState('')
  const [fromName, setFromName]   = useState(storeName || '')
  const [fromEmail, setFromEmail] = useState(storeEmail || '')
  const [bodyHtml, setBodyHtml]   = useState('')
  const [scheduledAt, setSchedule]= useState('')
  const [templateOpen, setTplOpen]= useState(false)
  const [saving, setSaving]       = useState(false)
  const [sending, setSending]     = useState(false)
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [previewMode, setPreview2]= useState(false)

  const supabase = createClient()

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())      e.name    = 'Campaign name required'
    if (!subject.trim())   e.subject = 'Subject line required'
    if (!fromEmail.trim()) e.from    = 'From email required'
    if (!bodyHtml.trim())  e.body    = 'Email body required'
    return e
  }

  async function saveDraft() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    const { data } = await supabase.from('email_campaigns').insert({
      store_id: storeId, 
      name, 
      subject, 
      preview_text: previewText,
      from_name: fromName, 
      from_email: fromEmail,
      body_html: bodyHtml, 
      status: 'draft',
      scheduled_at: scheduledAt || null,
    }).select().single()
    setSaving(false)
    if (data) onSaved()
  }

  async function sendNow() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSending(true)

    // Save first
    const { data: campaign } = await supabase.from('email_campaigns').insert({
      store_id: storeId, 
      name, 
      subject, 
      preview_text: previewText,
      from_name: fromName, 
      from_email: fromEmail,
      body_html: bodyHtml, 
      status: scheduledAt ? 'scheduled' : 'sending',
      scheduled_at: scheduledAt || null,
    }).select().single()

    if (!campaign) { setSending(false); return }

    // Send via API (only if not scheduled for future)
    if (!scheduledAt) {
      await fetch('/api/email/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, storeId }),
      })
    }

    setSending(false)
    onSaved()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Settings */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <span>⚙️</span> Campaign Settings
          </h3>

          {[
            { label: 'Campaign Name *', key: 'name', val: name, set: setName, ph: 'e.g. February Promo' },
            { label: 'Subject Line *', key: 'subject', val: subject, set: setSubject, ph: 'What\'s the email about?' },
            { label: 'Preview Text', key: 'preview', val: previewText, set: setPreview, ph: 'Short teaser shown in inbox...' },
            { label: 'From Name', key: 'fromName', val: fromName, set: setFromName, ph: 'Your store name' },
            { label: 'From Email *', key: 'fromEmail', val: fromEmail, set: setFromEmail, ph: 'noreply@yourstore.com' },
          ].map(({ label, key, val, set, ph }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-widest">{label}</label>
              <input
                type={key === 'fromEmail' ? 'email' : 'text'}
                value={val} onChange={(e) => { set(e.target.value); setErrors((p) => ({ ...p, [key]: '' })) }}
                placeholder={ph}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400 font-medium ${
                  errors[key] ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                }`}
                style={{ '--tw-ring-color': primaryColor } as any}
              />
              {errors[key] && <p className="text-red-500 text-xs mt-1 font-bold">⚠ {errors[key]}</p>}
            </div>
          ))}

          {/* Schedule */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-widest">
              Schedule Send <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setSchedule(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 text-gray-900 bg-white font-medium"
              style={{ '--tw-ring-color': primaryColor } as any}
            />
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-widest">Recipients</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 text-gray-700 bg-white font-medium"
              style={{ '--tw-ring-color': primaryColor } as any}>
              <option value="">All Subscribed Contacts</option>
              <option value="vip">VIP Customers</option>
              <option value="at_risk">At-Risk Customers</option>
              <option value="new">New Customers</option>
              <option value="inactive">Inactive (90+ days)</option>
            </select>
          </div>
        </div>

        {/* Personalization */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-700 mb-2.5 uppercase tracking-widest">💡 Personalisation Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {PERSONALIZATION_TAGS.map((t) => (
              <button
                key={t.tag}
                onClick={() => setBodyHtml((b) => b + t.tag)}
                className="text-xs font-mono bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg text-gray-700 transition-colors font-bold"
                title={t.label}
              >
                {t.tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Body editor */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 uppercase tracking-wide">
              <span>✉️</span> Email Body
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setTplOpen(true)}
                className="text-xs font-bold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-all bg-gray-50"
              >
                📄 Templates
              </button>
              <button
                onClick={() => setPreview2((p) => !p)}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                  previewMode ? 'text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50'
                }`}
                style={previewMode ? { backgroundColor: primaryColor } : {}}
              >
                {previewMode ? '✏️ Edit' : '👁️ Preview'}
              </button>
            </div>
          </div>

          {errors.body && (
            <p className="text-red-500 text-xs flex items-center gap-1 font-bold px-1">⚠ {errors.body}</p>
          )}

          {previewMode ? (
            <div
              className="border border-gray-100 rounded-2xl p-8 min-h-[450px] overflow-auto bg-gray-50/50 shadow-inner"
              dangerouslySetInnerHTML={{ __html: bodyHtml || '<p class="text-gray-400 text-center font-bold mt-20">Nothing to preview yet. Pick a template or start typing.</p>' }}
            />
          ) : (
            <textarea
              value={bodyHtml}
              onChange={(e) => { setBodyHtml(e.target.value); setErrors((p) => ({ ...p, body: '' })) }}
              placeholder="Write your HTML email here, or pick a template →"
              rows={25}
              className={`w-full border rounded-2xl px-4 py-4 text-xs font-mono focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400 resize-none leading-relaxed transition-all ${
                errors.body ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
              }`}
              style={{ '--tw-ring-color': primaryColor } as any}
            />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="flex-1 py-4 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-700 bg-white hover:border-gray-300 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? 'Saving…' : '💾 Save Draft'}
          </button>
          <button
            onClick={sendNow}
            disabled={sending}
            className="flex-1 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {sending ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending…
              </>
            ) : scheduledAt ? '⏰ Schedule Send' : '🚀 Send Now'}
          </button>
        </div>
      </div>

      {/* Template library */}
      <EmailTemplateLibrary
        isOpen={templateOpen}
        onClose={() => setTplOpen(false)}
        onSelect={(html) => { setBodyHtml(html); setTplOpen(false) }}
        primaryColor={primaryColor}
        storeName={storeName}
      />
    </div>
  )
}
