import Script from 'next/script'

export function StoreStructuredData({ store }: { store: any }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
  const schema = {
    '@context': 'https://schema.org/',
    '@graph': [
      {
        '@type':   'Store',
        '@id':     `${appUrl}/store/${store.id}`,
        name:       store.name,
        url:        `${appUrl}/store/${store.id}`,
        image:      store.logo_url ?? undefined,
        description: store.description ?? undefined,
        address: store.address ? {
          '@type':           'PostalAddress',
          streetAddress:     store.address,
          addressLocality:   store.city ?? 'Kuala Lumpur',
          addressRegion:     store.state ?? 'Kuala Lumpur',
          addressCountry:    'MY',
          postalCode:        store.postcode ?? '',
        } : undefined,
        telephone: store.phone ?? undefined,
        aggregateRating: store.rating > 0 ? {
          '@type':       'AggregateRating',
          ratingValue:   Number(store.rating).toFixed(1),
          reviewCount:   store.reviews_count,
          bestRating:    '5',
          worstRating:   '1',
        } : undefined,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home',  item: appUrl },
          { '@type': 'ListItem', position: 2, name: store.name, item: `${appUrl}/store/${store.id}` },
        ],
      },
    ],
  }

  return (
    <Script
      id={`json-ld-store-${store.id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
