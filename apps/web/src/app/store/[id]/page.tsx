import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveIndustry } from '@/lib/industry'
import { FnbStorePage } from '@/components/industry/fnb/FnbStorePage'
import { GroceryStorePage } from '@/components/industry/grocery/GroceryStorePage'
import { PharmacyStorePage } from '@/components/industry/pharmacy/PharmacyStorePage'
import { FashionStorePage } from '@/components/industry/fashion/FashionStorePage'
import { ElectronicsStorePage } from '@/components/industry/electronics/ElectronicsStorePage'
import type { FnbStore, FnbProduct, GroceryProduct, PharmacyProduct, FashionProduct, ElectronicsProduct } from '@/lib/industry/types'
import { StoreStructuredData } from '@/components/seo/StoreStructuredData'

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
    supabase.from('stores')
      .select('*, loyalty_programs(*)')
      .eq('id', id)
      .eq('is_active', true)
      .single(),
    supabase.from('products').select('*').eq('store_id', id).order('category').order('name'),
  ])

  if (!store) notFound()

  const industry = resolveIndustry(store.category)

  // Route to industry-specific layout
  const industryPage = (() => {
    if (industry === 'fnb') {
      return (
        <FnbStorePage
          store={store as FnbStore}
          products={(products ?? []) as FnbProduct[]}
        />
      )
    }

    if (industry === 'grocery') {
      // (Fetching bundles should ideally happen inside GroceryStorePage or here if needed)
      return (
        <GroceryStorePage
          store={store}
          products={(products ?? []) as GroceryProduct[]}
          bundles={[]} // Bundles fetch would be complex to inline here without restructuring
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

    if (industry === 'fashion') {
      return (
        <FashionStorePage
          store={store}
          products={(products ?? []) as FashionProduct[]}
        />
      )
    }

    if (industry === 'electronics') {
      return (
        <ElectronicsStorePage
          store={store}
          products={(products ?? []) as ElectronicsProduct[]}
        />
      )
    }

    // Default fallback
    return (
      <FnbStorePage
        store={store as FnbStore}
        products={(products ?? []) as FnbProduct[]}
      />
    )
  })()

  return (
    <>
      <StoreStructuredData store={store} />
      {industryPage}
    </>
  )
}

