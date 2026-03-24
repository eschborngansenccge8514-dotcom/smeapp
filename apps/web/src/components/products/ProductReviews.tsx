'use client'
import { useState } from 'react'
import { Star, ThumbsUp } from 'lucide-react'
import { formatDate } from '@/lib/date'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Props {
  productId: string
  reviews: any[]
  avgRating: number
  reviewCount: number
}

export function ProductReviews({ productId, reviews, avgRating, reviewCount }: Props) {
  const [filter, setFilter] = useState<number | null>(null)
  const supabase = createSupabaseBrowser()
  const router = useRouter()

  async function markHelpful(reviewId: string) {
    const { error } = await supabase.rpc('increment_product_review_helpful', { p_review_id: reviewId })
    if (error) {
      toast.error('Failed to mark as helpful')
    } else {
      router.refresh()
      toast.success('Marked as helpful')
    }
  }

  const filtered = filter ? reviews.filter((r) => r.rating === filter) : reviews
  const ratingCounts = [5,4,3,2,1].map((s) => ({
    star: s,
    count: reviews.filter((r) => r.rating === s).length,
  }))

  return (
    <div id="reviews" className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h2 className="font-bold text-xl text-gray-900 mb-6">
        Customer Reviews
        {reviewCount > 0 && <span className="text-gray-400 font-normal text-base ml-2">({reviewCount})</span>}
      </h2>

      {reviewCount === 0 ? (
        <p className="text-gray-400 text-center py-8">No reviews yet. Be the first to review!</p>
      ) : (
        <>
          {/* Rating summary */}
          <div className="flex items-center gap-8 mb-6 p-4 bg-gray-50 rounded-2xl">
            <div className="text-center">
              <p className="text-5xl font-bold text-gray-900">{Number(avgRating).toFixed(1)}</p>
              <div className="flex gap-0.5 justify-center my-1.5">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={16}
                    className={s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                ))}
              </div>
              <p className="text-xs text-gray-400">{reviewCount} reviews</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {ratingCounts.map(({ star, count }) => (
                <button key={star}
                  onClick={() => setFilter(filter === star ? null : star)}
                  className={`flex items-center gap-2 w-full rounded-lg px-2 py-0.5 transition-colors
                    ${filter === star ? 'bg-amber-50' : 'hover:bg-gray-100'}`}>
                  <span className="text-xs text-gray-500 w-3">{star}</span>
                  <Star size={11} className="text-amber-400 fill-amber-400" />
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: reviewCount ? `${(count / reviewCount) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-5">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {filter && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">Showing {filter}-star reviews</span>
              <button onClick={() => setFilter(null)}
                className="text-xs text-indigo-600 hover:underline">Clear filter</button>
            </div>
          )}

          <div className="space-y-5">
            {filtered.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-5 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 font-mono">
                      {review.profiles?.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{review.profiles?.full_name}</p>
                      <p className="text-xs text-gray-400">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={14}
                        className={s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                )}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {review.images.map((img: string, i: number) => (
                      <img key={i} src={img} className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                    ))}
                  </div>
                )}
                <button
                  onClick={() => markHelpful(review.id)}
                  className="flex items-center gap-1.5 mt-2 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <ThumbsUp size={13} />
                  Helpful ({review.helpful_count})
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
