import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { ReviewItem } from './ReviewItem'

export const metadata = { title: 'My Reviews' }

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reviews } = await supabase
    .from('product_reviews')
    .select(`
      *,
      products ( id, name, image_url ),
      stores ( name, slug )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">Share your feedback on products you have purchased</p>
      </div>

      {reviews && reviews.length > 0 ? (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">⭐</div>
          <h3 className="text-lg font-bold text-gray-900">No reviews yet</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">You haven't left any reviews for your purchases yet.</p>
        </div>
      )}
    </div>
  )
}
