import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { WishlistList } from './WishlistList'

export const metadata = { title: 'My Wishlist' }

export default async function WishlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: wishlist } = await supabase
    .from('wishlists')
    .select(`
      id,
      product_id,
      store_id,
      products (
        id, name, price, image_url,
        stores ( name, slug )
      )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Wishlist</h1>
        <p className="text-sm text-gray-500 mt-0.5">Products you have saved for later</p>
      </div>

      <WishlistList initialItems={wishlist || []} />
    </div>
  )
}
