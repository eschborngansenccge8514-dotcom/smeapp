import {
  getProductInputsClient,
  getProductsClient,
  ACCOUNT_NAME,
  TARGET_COUNTRY,
  LANGUAGE,
  FEED_LABEL,
  CURRENCY,
  APP_URL,
} from './client'
import { getOrCreatePrimaryDataSource } from './dataSource'

// ─── Types ──────────────────────────────────────────────────────
export interface GMCProduct {
  id:           string
  store_id:     string
  name:         string
  description:  string | null
  price:        number
  image_urls:   string[]
  stock_qty:    number
  is_available: boolean
  sku:          string | null
  weight_kg:    number | null
  avg_rating:   number
  review_count: number
  category_name?: string
  store_name:   string
}

export interface SyncResult {
  productId:  string
  offerId:    string
  success:    boolean
  gmcName?:   string
  error?:     string
}

// ─── Build GMC product payload ───────────────────────────────────
function buildProductInput(product: GMCProduct, dataSource: string) {
  const inStock     = product.is_available && product.stock_qty > 0
  const productUrl  = `${APP_URL}/store/${product.store_id}/product/${product.id}`
  const offerId     = product.sku ?? product.id

  const attributes: any = {
    title:           product.name,
    description:     product.description ?? product.name,
    link:            productUrl,
    availability:    inStock ? 'IN_STOCK' : 'OUT_OF_STOCK',
    condition:       'NEW',
    price: {
      amountMicros: Math.round(product.price * 1_000_000),
      currencyCode: CURRENCY,
    },
    brand:           product.store_name,
    identifierExists: false,
  }

  // Images
  if (product.image_urls?.[0]) {
    attributes.imageLink = product.image_urls[0]
    if (product.image_urls.length > 1) {
      attributes.additionalImageLinks = product.image_urls.slice(1, 11)
    }
  }

  // Weight (required for some categories)
  if (product.weight_kg) {
    attributes.shippingWeight = {
      value: product.weight_kg,
      unit:  'kg',
    }
  }

  // Category mapping
  if (product.category_name) {
    attributes.productTypes = [product.category_name]
  }

  // Rating (if available)
  if (product.avg_rating > 0) {
    attributes.aggregateRating = {
      ratingValue: product.avg_rating,
      reviewCount: product.review_count,
    }
  }

  return {
    parent:       ACCOUNT_NAME,
    dataSource,
    productInput: {
      offerId,
      contentLanguage: LANGUAGE,
      feedLabel:       FEED_LABEL,
      productAttributes: attributes,
    },
  }
}

// ─── Insert / Update single product ─────────────────────────────
export async function syncProduct(product: GMCProduct): Promise<SyncResult> {
  try {
    const client     = getProductInputsClient()
    const dataSource = await getOrCreatePrimaryDataSource()
    const request    = buildProductInput(product, dataSource)

    const [response] = (await client.insertProductInput(request)) as any

    return {
      productId: product.id,
      offerId:   request.productInput.offerId,
      success:   true,
      gmcName:   (response as any).name,
    }
  } catch (err: any) {
    return {
      productId: product.id,
      offerId:   product.sku ?? product.id,
      success:   false,
      error:     err.message,
    }
  }
}

// ─── Delete single product from GMC ─────────────────────────────
export async function deleteGMCProduct(offerId: string): Promise<boolean> {
  try {
    const client     = getProductInputsClient()
    const dataSource = await getOrCreatePrimaryDataSource()

    // Name format: accounts/{account}/dataSources/{dataSource}/productInputs/{productInputId}
    // productInputId format: contentLanguage~feedLabel~offerId
    const productInputId = `${LANGUAGE}~${FEED_LABEL}~${offerId}`
    const dsId = dataSource.split('/').pop()

    await client.deleteProductInput({
      name: `${ACCOUNT_NAME}/dataSources/${dsId}/productInputs/${productInputId}`,
    })
    return true
  } catch (err: any) {
    console.error('[GMC Delete] Error:', err.message)
    return false
  }
}

// ─── Batch sync up to 250 products ──────────────────────────────
export async function batchSyncProducts(products: GMCProduct[]): Promise<{
  succeeded: number
  failed:    number
  errors:    SyncResult[]
}> {
  const BATCH_SIZE = 50  // process in parallel batches of 50
  const results: SyncResult[] = []

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.allSettled(batch.map(syncProduct))
    batchResults.forEach((r) => {
      if (r.status === 'fulfilled') results.push(r.value)
      else results.push({ productId: 'unknown', offerId: 'unknown', success: false, error: (r as any).reason?.message })
    })
    // Rate limit: brief pause between batches
    if (i + BATCH_SIZE < products.length) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  const succeeded = results.filter((r) => r.success).length
  const failed    = results.filter((r) => !r.success).length

  return { succeeded, failed, errors: results.filter((r) => !r.success) }
}

// ─── Get GMC product status ──────────────────────────────────────
export async function getGMCProductStatus(offerId: string): Promise<any> {
  try {
    const client = getProductsClient()
    const dsId   = (await getOrCreatePrimaryDataSource()).split('/').pop()
    const name   = `${ACCOUNT_NAME}/products/online~${LANGUAGE}~${FEED_LABEL}~${offerId}`
    const [product] = (await client.getProduct({ name })) as any
    return product
  } catch {
    return null
  }
}
