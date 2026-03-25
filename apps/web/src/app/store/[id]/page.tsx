import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveIndustry } from '@/lib/industry'
import { FnbStorePage } from '@/components/industry/fnb/FnbStorePage'
import { GroceryStorePage } from '@/components/industry/grocery/GroceryStorePage'
import { PharmacyStorePage } from '@/components/industry/pharmacy/PharmacyStorePage'
import type { FnbStore, FnbProduct, GroceryProduct, PharmacyProduct } from '@/lib/industry/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('stores').select('name, description').eq('id', id).single()
  return { title: data?.name ?? 'Store', description: data?.description ?? '' }
}

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: store }, { data: products }] = await Promise.all([
    supabase.from('stores').select('*').eq('id', id).eq('is_active', true).single(),
    supabase.from('products').select('*').eq('store_id', id).order('category').order('name'),
  ])

  if (!store) notFound()

  const industry = resolveIndustry(store.category)

  // Route to industry-specific layout
  if (industry === 'fnb') {
    return (
      <FnbStorePage
        store={store as FnbStore}
        products={(products ?? []) as FnbProduct[]}
      />
    )
  }

  if (industry === 'grocery') {
    const { data: bundlesData } = await supabase
      .from('bundles')
      .select('*, bundle_products(*, products(*))')
      .eq('store_id', id)
      .eq('is_active', true)
      .gt('end_date', new Date().toISOString())

    // Flatten bundles to match GroceryBundle interface
    const bundles = (bundlesData ?? []).map((b: any) => ({
      ...b,
      products: b.bundle_products.map((bp: any) => bp.products)
    }))

    return (
      <GroceryStorePage
        store={store}
        products={(products ?? []) as GroceryProduct[]}
        bundles={bundles}
      />
    )
  }

  if (industry === 'pharmacy') {
    return (
      <PharmacyStorePage
        store={store}
        products={(products ?? []) as PharmacyProduct[]}
      />
    )
  }

  // Default fallback (existing generic layout)
  return (
    <FnbStorePage
      store={store as FnbStore}
      products={(products ?? []) as FnbProduct[]}
    />
  )
}
