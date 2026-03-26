'use client'
import { useState, useRef } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { Upload, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface ImageUploadProps {
  bucket: 'product-images' | 'store-logos' | 'avatars' | 'hero-slides' | 'payment-proofs'

  label?: string
  currentUrl?: string | null
  onUpload: (url: string) => void
  onRemove?: () => void
  accept?: string
  maxSizeMB?: number
}

export function ImageUpload({
  bucket, label, currentUrl, onUpload, onRemove,
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 5,
}: ImageUploadProps) {
  const supabase = createSupabaseBrowser()
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Max ${maxSizeMB}MB`)
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const filePath = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      onUpload(publicUrl)
      toast.success('Image uploaded')
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      {label && <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>}
      {currentUrl ? (
        <div className="relative inline-block">
          <img
            src={currentUrl}
            alt="Upload preview"
            className="w-24 h-24 rounded-xl object-cover border border-gray-200"
          />
          {onRemove && (
            <button
              onClick={onRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center"
            >
              <X size={11} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-400 transition-colors"
        >
          {uploading
            ? <Loader2 size={20} className="animate-spin" />
            : <><Upload size={20} /><span className="text-xs mt-1">Upload</span></>
          }
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
    </div>
  )
}
