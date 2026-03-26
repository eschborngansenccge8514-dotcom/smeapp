import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getStore } from '@/lib/data/stores'
import { getStoreProducts } from '@/lib/data/products'
import { getStoreFeeConfig } from '@/lib/data/fees'
import { StoreSkeleton } from '@/components/skeletons/StoreSkeleton'
import { StorePageClient } from './StorePageClient'

export const revalidate = 60

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const store = await getStore(slug)
  if (!store) return { title: 'Store not found' }

  return {
    title:       `${store.name} — SME App`,
    description: store.description ?? `Shop at ${store.name}`,
    openGraph: {
      title:       store.name,
      description: store.description ?? '',
      images:      store.logo_url ? [{ url: store.logo_url, width: 400, height: 400 }] : [],
      type:        'website',
    },
    twitter: {
      card:  'summary_large_image',
      title: store.name,
    },
    alternates: { canonical: `/stores/${slug}` },
    robots:     { index: true, follow: true },
  }
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string; cat?: string; sort?: string; page?: string }>
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])

  const store = await getStore(slug)
  if (!store) notFound()

  // Parallel data fetching
  const [initialData, feeConfig] = await Promise.all([
    getStoreProducts(store.id, 1, 20, sp.cat, sp.q),
    getStoreFeeConfig(store.id),
  ])

  // ── JSON-LD Structured Data ────────────────────────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name:        store.name,
    description: store.description,
    image:       store.logo_url,
    url:         `${process.env.NEXT_PUBLIC_APP_URL}/stores/${slug}`,
    address: store.address ? {
      '@type':         'PostalAddress',
      streetAddress:   store.address,
      addressLocality: store.city,
      addressRegion:   store.state,
      addressCountry:  'MY',
    } : undefined,
    telephone:    store.phone,
    priceRange:   '$$',
    aggregateRating: store.rating ? {
      '@type':       'AggregateRating',
      ratingValue:   store.rating,
      reviewCount:   store.review_count ?? 0,
    } : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<StoreSkeleton />}>
        <StorePageClient
          store={store}
          initialProducts={initialData.products}
          initialHasMore={initialData.hasMore}
          feeConfig={feeConfig}
          initialQuery={sp.q ?? ''}
          initialCategory={sp.cat ?? 'All'}
        />
      </Suspense>
    </>
  )
}
