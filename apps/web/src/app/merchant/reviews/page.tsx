import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReviewsList } from '@/components/merchant/reviews/ReviewsList'

export default async function MerchantReviewsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id, rating, reviews_count').eq('owner_id', user.id).single()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profiles(full_name, avatar_url), orders(id, total_amount)')
    .eq('store_id', store!.id)
    .order('created_at', { ascending: false })

  const ratings = [5, 4, 3, 2, 1].map((r) => ({
    star: r,
    count: reviews?.filter((rv) => rv.rating === r).length ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">
          {Number(store?.rating ?? 0).toFixed(1)} ⭐ · {store?.reviews_count ?? 0} reviews
        </p>
      </div>

      {/* Rating breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-8">
        <div className="text-center">
          <p className="text-5xl font-bold text-gray-900">{Number(store?.rating ?? 0).toFixed(1)}</p>
          <div className="flex gap-0.5 justify-center mt-1">
            {[1,2,3,4,5].map((s) => (
              <span key={s} className={s <= Math.round(store?.rating ?? 0) ? 'text-amber-400' : 'text-gray-200'}>★</span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">{store?.reviews_count} reviews</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {ratings.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-4">{star}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${store?.reviews_count ? (count / store.reviews_count) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-5">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <ReviewsList reviews={reviews ?? []} />
    </div>
  )
}
