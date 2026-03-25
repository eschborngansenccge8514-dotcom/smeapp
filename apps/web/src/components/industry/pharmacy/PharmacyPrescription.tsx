'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  isOpen: boolean
  onClose: () => void
  onUploaded: (url: string) => void
  primaryColor: string
}

export function PharmacyPrescription({ isOpen, onClose, onUploaded, primaryColor }: Props) {
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const [notes, setNotes]       = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type)) {
      setError('Only JPG, PNG, WebP or PDF files accepted')
      return
    }
    setFile(f)
    setError('')
    if (f.type !== 'application/pdf') {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true); setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Please sign in first'); setUploading(false); return }

    const ext = file.name.split('.').pop()
    const path = `prescriptions/${user.id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('prescriptions')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadErr) { setError(uploadErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage
      .from('prescriptions')
      .getPublicUrl(path)

    onUploaded(publicUrl)
    setUploading(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Upload Prescription</h2>
              <p className="text-xs text-gray-500 mt-0.5">JPG, PNG, PDF — max 10MB</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">✕</button>
          </div>

          <div className="p-5 space-y-4">
            {/* Important notice */}
            <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
              <span className="text-blue-500 shrink-0 mt-0.5">ℹ️</span>
              <p className="text-blue-700 text-xs leading-relaxed">
                Your prescription will be reviewed by our pharmacist before your order is processed. Ensure the prescription is valid, clear, and includes the doctor's stamp.
              </p>
            </div>

            {/* Upload area */}
            {!file ? (
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                <span className="text-4xl">📄</span>
                <div className="text-center">
                  <p className="font-semibold text-gray-700 text-sm">Click to upload</p>
                  <p className="text-xs text-gray-400 mt-0.5">or drag and drop your prescription here</p>
                </div>
                <span
                  className="text-xs font-semibold px-4 py-2 rounded-xl text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Choose File
                </span>
              </button>
            ) : (
              <div className="relative">
                {preview ? (
                  <img src={preview} alt="Prescription preview"
                    className="w-full h-48 object-contain rounded-2xl border border-gray-100 bg-gray-50" />
                ) : (
                  <div className="w-full h-32 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col items-center justify-center gap-2">
                    <span className="text-4xl">📄</span>
                    <p className="text-sm font-semibold text-gray-600">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                )}
                <button
                  onClick={() => { setFile(null); setPreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-gray-500 text-sm hover:bg-gray-50"
                >
                  ✕
                </button>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Doctor notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes for pharmacist <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Brand preference, quantity needed, known allergies…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none text-gray-900 placeholder-gray-400"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm flex items-center gap-2">⚠ {error}</p>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {uploading ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>Uploading…</>
              ) : '📋 Submit Prescription'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
