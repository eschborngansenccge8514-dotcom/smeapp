import Script from 'next/script'

interface Props {
  product:  any
  storeId:  string
}

export function ProductStructuredData({ product, storeId }: Props) {
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
  const inStock  = product.is_available && (product.stock_qty ?? 0) > 0
  const productUrl = `${appUrl}/store/${storeId}/product/${product.id}`

  const schema: Record<string, any> = {
    '@context': 'https://schema.org/',
    '@type':    'Product',
    name:       product.name,
    description: product.description ?? product.name,
    url:        productUrl,
    sku:        product.sku ?? product.id,
    brand: {
      '@type': 'Brand',
      name:    (product.stores as any)?.name ?? 'Store',
    },
    offers: {
      '@type':         'Offer',
      url:             productUrl,
      priceCurrency:   'MYR',
      price:           (product.price ?? 0).toFixed(2),
      availability:    inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition:  'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name:    (product.stores as any)?.name ?? 'Store',
      },
      shippingDetails: {
        '@type':           'OfferShippingDetails',
        shippingRate: {
          '@type':        'MonetaryAmount',
          currency:       'MYR',
          value:          0, // Assumed free or dynamic from props
        },
        shippingDestination: {
          '@type':            'DefinedRegion',
          addressCountry:     'MY',
        },
        deliveryTime: {
          '@type':          'ShippingDeliveryTime',
          handlingTime: {
            '@type':      'QuantitativeValue',
            minValue:     0, maxValue: 1, unitCode: 'd',
          },
          transitTime: {
            '@type':      'QuantitativeValue',
            minValue:     1, maxValue: 5, unitCode: 'd',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type':               'MerchantReturnPolicy',
        applicableCountry:     'MY',
        returnPolicyCategory:  'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays:    7,
        returnMethod:          'https://schema.org/ReturnByMail',
        returnFees:            'https://schema.org/FreeReturn',
      },
    },
  }

  // Images
  if (product.image_urls?.length > 0) {
    schema.image = product.image_urls.slice(0, 5)
  }

  // Aggregate Rating
  if (product.avg_rating > 0 && product.review_count > 0) {
    schema.aggregateRating = {
      '@type':       'AggregateRating',
      ratingValue:   product.avg_rating.toFixed(1),
      reviewCount:   product.review_count,
      bestRating:    '5',
      worstRating:   '1',
    }
  }

  // Individual reviews (first 5)
  if (product.product_reviews?.length > 0) {
    schema.review = product.product_reviews.slice(0, 5).map((r: any) => ({
      '@type':       'Review',
      reviewRating: {
        '@type':       'Rating',
        ratingValue:   r.rating,
        bestRating:    '5',
        worstRating:   '1',
      },
      author: {
        '@type': 'Person',
        name:    (r.profiles as any)?.full_name ?? 'Verified Buyer',
      },
      datePublished: new Date(r.created_at).toISOString().slice(0, 10),
      reviewBody:    r.comment ?? '',
    }))
  }

  // Weight
  if (product.weight_kg) {
    schema.weight = {
      '@type':    'QuantitativeValue',
      value:      product.weight_kg,
      unitCode:   'KGM',
    }
  }

  return (
    <Script
      id={`json-ld-product-${product.id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
