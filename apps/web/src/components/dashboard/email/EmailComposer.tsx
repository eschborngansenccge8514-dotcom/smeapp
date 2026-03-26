'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmailTemplateLibrary } from './EmailTemplateLibrary'

interface Props {
  storeId: string
  primaryColor: string
}

export function EmailComposer({ storeId, primaryColor }: Props) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    fromName: '',
    fromEmail: '',
    bodyHtml: '',
    segmentId: null,
  })
  const [sending, setSending] = useState(false)
  const supabase = createClient()

  async function handleSend() {
    setSending(true)
    // 1. Create campaign in DB
    const { data: campaign, error } = await supabase
      .from('email_campaigns')
      .insert({
        store_id: storeId,
        ...formData,
        status: 'sending'
      })
      .select()
      .single()

    if (error) { setSending(false); return }

    // 2. Call local API to handle Resend delivery
    const res = await fetch('/api/email/send-campaign', {
      method: 'POST',
      body: JSON.stringify({ campaignId: campaign.id })
    })

    if (res.ok) {
       setStep(3) // Success
    }
    setSending(false)
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden max-w-4xl mx-auto flex h-[600px]">
      {/* Sidebar navigation */}
      <div className="w-64 bg-gray-50/80 border-r border-gray-100 p-6 flex flex-col gap-6 shrink-0">
        <h3 className="font-bold text-gray-900 text-lg">New Campaign</h3>
        <div className="space-y-4">
          {[
            { n: 1, s: 'Design',     i: '🎨' },
            { n: 2, s: 'Recipients', i: '👥' },
            { n: 3, s: 'Review',     i: '✅' },
          ].map((s) => (
            <button
              key={s.n}
              onClick={() => step > s.n && setStep(s.n)}
              className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all ${
                step === s.n ? 'bg-white shadow-sm ring-1 ring-gray-100' : 'opacity-60 grayscale hover:grayscale-0 pointer-events-none'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm ${
                  step === s.n ? 'text-white' : 'bg-gray-200'
                }`}
                style={step === s.n ? { backgroundColor: primaryColor } : {}}
              >
                {s.i}
              </div>
              <span className="text-sm font-bold text-gray-700">{s.s}</span>
            </button>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-8 pb-4 flex-1 overflow-y-auto space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Internal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Sale 2024"
                  className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 focus:border-opacity-50 transition-all outline-none font-medium text-sm"
                  style={{ '--tw-border-opacity': '1', borderColor: primaryColor + '20' } as any}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Subject</label>
                <input
                  type="text"
                  placeholder="The subject line..."
                  className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 focus:border-opacity-100 transition-all outline-none font-medium text-sm"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
            </div>

            <EmailTemplateLibrary
              onSelect={(template) => setFormData({ ...formData, bodyHtml: template.html, subject: template.subject })}
              primaryColor={primaryColor}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">HTML Body</label>
              <textarea
                className="w-full h-48 px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-opacity-100 transition-all outline-none font-mono text-xs leading-relaxed"
                value={formData.bodyHtml}
                onChange={(e) => setFormData({ ...formData, bodyHtml: e.target.value })}
              />
            </div>
          </div>
          <div className="p-5 border-t border-gray-50 flex justify-end">
             <button
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.subject || !formData.bodyHtml}
              className="px-8 py-3 rounded-2xl text-white font-bold shadow-lg shadow-opacity-20 transition-all disabled:opacity-30 flex items-center gap-2 hover:scale-[1.02] active:scale-95"
              style={{ backgroundColor: primaryColor }}
             >
              Choose Audience
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
             </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col p-12 items-center justify-center space-y-8 animate-in fade-in zoom-in duration-300">
           <div className="text-center max-w-sm space-y-4">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-sm border-2 border-white ring-8 ring-gray-50">👥</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Who's the target?</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">Select which of your customer segments should receive this campaign.</p>
              </div>
           </div>
           
           <div className="w-full max-w-sm space-y-3">
              {[
                { id: null, name: 'All Subscribed Customers', desc: 'Best for shop-wide announcements' },
                { id: 'vip', name: 'VIP Segment', desc: 'Loyal customers with 5+ orders' },
                { id: 'at-risk', name: 'At Risk', desc: 'Haven\'t ordered in 30 days' },
              ].map((s) => (
                <button
                  key={s.id as any}
                  onClick={() => setFormData({ ...formData, segmentId: s.id as any })}
                  className={`w-full p-4 rounded-2xl text-left transition-all border-2 flex items-center gap-4 group ${
                    formData.segmentId === s.id ? 'border-opacity-100 shadow-xl' : 'border-gray-50 hover:border-gray-100 hover:bg-gray-50'
                  }`}
                  style={formData.segmentId === s.id ? { borderColor: primaryColor, backgroundColor: primaryColor + '05' } : {}}
                >
                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.segmentId === s.id ? 'border-transparent' : 'border-gray-200'}`} style={formData.segmentId === s.id ? { backgroundColor: primaryColor } : {}}>
                      {formData.segmentId === s.id && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                   </div>
                   <div>
                     <p className="text-sm font-bold text-gray-900">{s.name}</p>
                     <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{s.desc}</p>
                   </div>
                </button>
              ))}
           </div>

           <button
            onClick={handleSend}
            disabled={sending}
            className="w-full max-w-sm py-4 rounded-3xl text-white font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
           >
            {sending ? 'Launching Campaign...' : '🚀 Launch Campaign Now'}
           </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex flex-col p-20 items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
           <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center text-6xl shadow-inner border-[12px] border-white ring-[24px] ring-green-50/30">✨</div>
           <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Campaign Launched!</h2>
              <p className="text-lg text-gray-500 font-medium">Your emails are being delivered to the segment.</p>
           </div>
           <button
             onClick={() => { setStep(1); setFormData({ ...formData, name: '', subject: '', bodyHtml: '' }) }}
             className="px-10 py-4 bg-gray-900 text-white rounded-3xl font-bold shadow-2xl hover:bg-black transition-all"
           >
             Create Another Campaign
           </button>
        </div>
      )}
    </div>
  )
}
