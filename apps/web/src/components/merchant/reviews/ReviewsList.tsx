'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { formatDate } from '@/lib/date'
import { MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

export function ReviewsList({ reviews }: { reviews: any[] }) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitReply(reviewId: string) {
    if (!replyText.trim()) return
    setLoading(true)
    const { error } = await supabase
      .from('reviews')
      .update({ merchant_reply: replyText.trim(), replied_at: new Date().toISOString() })
      .eq('id', reviewId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Reply posted')
      setReplyingTo(null)
      setReplyText('')
      router.refresh()
    }
    setLoading(false)
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
        <p className="text-5xl mb-3">⭐</p>
        <p className="text-gray-500">No reviews yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                {review.profiles?.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{review.profiles?.full_name}</p>
                <p className="text-xs text-gray-400">{formatDate(review.created_at)}</p>
              </div>
            </div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <span key={s} className={`text-lg ${s <= review.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
              ))}
            </div>
          </div>

          {review.comment && (
            <p className="text-gray-700 text-sm mb-3">{review.comment}</p>
          )}

          {review.merchant_reply ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mt-2">
              <p className="text-xs font-semibold text-indigo-700 mb-1">Your Reply</p>
              <p className="text-sm text-gray-700">{review.merchant_reply}</p>
            </div>
          ) : (
            replyingTo === review.id ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Write a reply to this review..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => submitReply(review.id)} disabled={loading}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
                    {loading ? 'Posting...' : 'Post Reply'}
                  </button>
                  <button onClick={() => { setReplyingTo(null); setReplyText('') }}
                    className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setReplyingTo(review.id); setReplyText('') }}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 mt-2"
              >
                <MessageSquare size={13} /> Reply to this review
              </button>
            )
          )}
        </div>
      ))}
    </div>
  )
}
