'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { LeaveReviewModal } from '@/components/account/LeaveReviewModal'
import { useRouter } from 'next/navigation'

export function ReviewItem({ review }: { review: any }) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-6">
        <Link 
          href={`/products/${review.product_id}`} 
          className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100"
        >
          {review.products?.image_url ? (
            <Image src={review.products.image_url} alt={review.products.name} width={80} height={80} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-100">📦</div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <Link href={`/products/${review.product_id}`} className="block">
                <h3 className="font-bold text-gray-900 truncate hover:text-indigo-600 transition-colors">
                  {review.products?.name}
                </h3>
              </Link>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex text-yellow-400 text-sm">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i}>{i <= review.rating ? '★' : '☆'}</span>
                  ))}
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {format(new Date(review.created_at), 'dd MMM yyyy')}
                </span>
                {!review.is_visible && (
                  <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded uppercase tracking-wider">Hidden</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 p-2 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Edit Review
            </button>
          </div>

          <div className="mt-4">
            {review.title && <p className="text-sm font-bold text-gray-900 mb-1">{review.title}</p>}
            {review.body ? (
              <p className="text-sm text-gray-600 leading-relaxed italic">"{review.body}"</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No comment provided.</p>
            )}
          </div>

          {review.merchant_reply && (
            <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-50">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Merchant Response</p>
              <p className="text-sm text-indigo-900 line-clamp-3">{review.merchant_reply}</p>
            </div>
          )}
        </div>
      </div>

      <LeaveReviewModal
        open={modalOpen}
        review={review}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
