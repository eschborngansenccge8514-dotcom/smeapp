'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { submitReview, type ReviewInput } from '@/lib/actions/reviews'

interface Props {
  open: boolean
  review: any                // order item or existing review
  onClose: () => void
  onSaved: () => void
  // When called from Order Detail page:
  productId?: string
  storeId?: string
  orderId?: string
  productName?: string
  productImage?: string | null
}

export function LeaveReviewModal({
  open, review, onClose, onSaved,
  productId, storeId, orderId, productName, productImage,
}: Props) {
  const isEdit  = !!review?.rating
  const [rating, setRating]   = useState<number>(review?.rating ?? 0)
  const [hovered, setHovered] = useState<number>(0)
  const [title, setTitle]     = useState(review?.title ?? '')
  const [body, setBody]       = useState(review?.body ?? '')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const displayRating = hovered || rating

  const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating'); return }
    setSaving(true)
    setError(null)
    try {
      await submitReview({
        product_id: productId ?? review.product_id,
        store_id:   storeId   ?? review.store_id,
        order_id:   orderId   ?? review.order_id,
        rating,
        title: title.trim() || undefined,
        body:  body.trim()  || undefined,
      })
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const imgSrc  = productImage ?? review?.products?.image_url
  const pName   = productName  ?? review?.products?.name ?? 'Product'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-x-4 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl z-50 shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">{isEdit ? 'Edit Review' : 'Leave a Review'}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 font-bold">✕</button>
            </div>

            {/* Product info */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 mb-5">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                {imgSrc ? (
                  <Image src={imgSrc} alt={pName} width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📦</div>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 line-clamp-2">{pName}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star selector */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Your Rating *</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(i)}
                      className={`text-4xl transition-all ${i <= displayRating ? 'text-yellow-400 scale-110' : 'text-gray-200 hover:text-yellow-200'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {displayRating > 0 && (
                  <p className="text-sm font-bold text-yellow-600">{STAR_LABELS[displayRating]}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Review Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="Summarise your experience"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Your Review (optional)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="What did you like or dislike? Would you recommend it?"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">{body.length}/1000</p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5 border border-red-100">
                  ⚠️ {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || rating === 0}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {saving ? 'Submitting…' : isEdit ? 'Update Review' : 'Submit Review ⭐'}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
