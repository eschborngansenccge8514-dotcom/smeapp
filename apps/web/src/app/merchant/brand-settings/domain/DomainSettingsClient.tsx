'use client'
import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  addCustomDomain, verifyCustomDomain, removeCustomDomain,
} from '@/lib/actions/domains'

interface Store {
  id:                 string
  slug:               string
  name:               string
  custom_domain:      string | null
  domain_verified:    boolean
  domain_txt_record:  string | null
  subdomain_active:   boolean
}

export function DomainSettingsClient({
  store, rootDomain,
}: { store: Store; rootDomain: string }) {
  const [domain, setDomain]         = useState('')
  const [txtRecord, setTxtRecord]   = useState(store.domain_txt_record)
  const [status, setStatus]         = useState<{ ok: boolean; msg: string } | null>(null)
  const [verifyResult, setVerify]   = useState<{ ok: boolean; msg: string } | null>(null)
  const [isPending, start]          = useTransition()
  const [tab, setTab]               = useState<'subdomain' | 'custom'>('subdomain')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    start(async () => {
      const result = await addCustomDomain(store.id, domain)
      if (result.success) {
        setTxtRecord(result.txtRecord ?? null)
        setStatus({ ok: true, msg: 'Domain added! Now set your DNS records below.' })
        setDomain('')
      } else {
        setStatus({ ok: false, msg: result.error ?? 'Failed to add domain' })
      }
    })
  }

  async function handleVerify() {
    setVerify(null)
    start(async () => {
      const result = await verifyCustomDomain(store.id)
      setVerify({
        ok:  result.verified,
        msg: result.verified
          ? '✅ Domain verified! Your store is now live on this domain.'
          : `❌ DNS record not found yet. ${result.error ?? 'DNS changes can take up to 24 hours.'}`,
      })
    })
  }

  async function handleRemove() {
    if (!confirm(`Remove ${store.custom_domain}? Your store will stop working on this domain.`)) return
    start(async () => {
      await removeCustomDomain(store.id)
      window.location.reload()
    })
  }

  const subdomainUrl = `https://${store.slug}.${rootDomain}`
  const inputClass   = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white font-mono text-gray-900'
  const codeClass    = 'block bg-gray-900 text-green-400 font-mono text-xs px-4 py-3 rounded-xl overflow-x-auto select-all'

  return (
    <div className="max-w-2xl space-y-6 mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Domain Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure where customers find your store
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
        {(['subdomain', 'custom'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'subdomain' ? '🔗 Free Subdomain' : '🌐 Custom Domain'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Subdomain Tab ──────────────────────────────────────────────── */}
        {tab === 'subdomain' && (
          <motion.div
            key="subdomain"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 text-sm mb-1 flex items-center gap-2">
                🔗 Your Free Subdomain
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Included with every store. Ready immediately, no setup needed.
              </p>

              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <span className="text-green-500 text-lg shrink-0">✅</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-green-800 text-sm truncate">{subdomainUrl}</p>
                  <p className="text-xs text-green-600 mt-0.5">Active and verified</p>
                </div>
                <a
                  href={subdomainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-green-700 hover:underline shrink-0"
                >
                  Visit →
                </a>
              </div>

              <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2 text-xs text-gray-600">
                <p className="font-bold text-gray-700">Share your store link:</p>
                <code className={codeClass}>{subdomainUrl}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(subdomainUrl)}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  📋 Copy link
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Custom Domain Tab ───────────────────────────────────────────── */}
        {tab === 'custom' && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            {/* Current custom domain */}
            {store.custom_domain ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{store.custom_domain}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {store.domain_verified ? (
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-yellow-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                          Pending verification
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isPending}
                    className="text-xs font-bold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {/* DNS instructions */}
                {!store.domain_verified && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-4">
                    <p className="text-sm font-bold text-amber-900">
                      🔧 Complete DNS Setup
                    </p>
                    <p className="text-xs text-amber-800">
                      Add these records at your domain registrar (GoDaddy, Cloudflare, Namecheap, etc.):
                    </p>

                    {/* CNAME record */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-gray-700">1. CNAME record (required)</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                          <p className="text-gray-400 text-[10px] uppercase font-bold">Type</p>
                          <code className="font-mono font-bold text-gray-900">CNAME</code>
                        </div>
                        <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                          <p className="text-gray-400 text-[10px] uppercase font-bold">Name</p>
                          <code className="font-mono font-bold text-gray-900">@</code>
                        </div>
                        <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                          <p className="text-gray-400 text-[10px] uppercase font-bold">Value</p>
                          <code className="font-mono font-bold text-gray-900 text-[10px]">
                            cname.vercel-dns.com
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* TXT verification record */}
                    {txtRecord && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-gray-700">2. TXT record (for verification)</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                            <p className="text-gray-400 text-[10px] uppercase font-bold">Type</p>
                            <code className="font-mono font-bold text-gray-900">TXT</code>
                          </div>
                          <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                            <p className="text-gray-400 text-[10px] uppercase font-bold">Name</p>
                            <code className="font-mono font-bold text-gray-900 text-[10px]">
                              _mymarket-verify
                            </code>
                          </div>
                          <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                            <p className="text-gray-400 text-[10px] uppercase font-bold">Value</p>
                            <code className="font-mono font-bold text-gray-900 text-[10px] break-all">
                              {txtRecord}
                            </code>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Verify button */}
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={isPending}
                      className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2"
                    >
                      {isPending
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Checking DNS…</>
                        : '🔍 Verify DNS Records'
                      }
                    </button>

                    {verifyResult && (
                      <p className={`text-xs font-semibold p-3 rounded-xl ${
                        verifyResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {verifyResult.msg}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Add custom domain form */
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 text-sm mb-1">🌐 Connect Your Domain</h2>
                <p className="text-xs text-gray-500 mb-5">
                  Use your own domain like <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700">shop.yourbrand.com</code>
                </p>

                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Domain Name
                    </label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="shop.yourbrand.com"
                      required
                      className={inputClass}
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Enter without https://. Use www.yourdomain.com or a subdomain.
                    </p>
                  </div>

                  {status && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-xs font-semibold px-4 py-3 rounded-xl ${
                        status.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {status.msg}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={isPending || !domain}
                    className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isPending
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding…</>
                      : '➕ Add Domain'
                    }
                  </button>
                </form>
              </div>
            )}

            {/* Plans note */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0">💡</span>
              <div>
                <p className="text-sm font-bold text-indigo-900">Custom domains are free</p>
                <p className="text-xs text-indigo-700 mt-0.5">
                  You only need to own the domain. We handle SSL certificates automatically via Vercel.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
