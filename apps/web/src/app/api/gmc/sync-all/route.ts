import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { batchSyncProducts } from '@repo/lib/gmc/productSync'

export async function POST(req: NextRequest) {
  // Secured by cron secret OR internal secret
  const authHeader = req.headers.get('authorization')
  const internalSecretHeader = req.headers.get('x-internal-secret')
  const cronSecret = process.env.CRON_SECRET;
  const internalSecret = process.env.INTERNAL_SECRET;

  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    internalSecretHeader === internalSecret

  if (!isAuthorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createSupabaseAdmin()
  const { data: products } = await admin
    .from('products')
    .select(`
      id, store_id, name, description, price, image_urls,
      stock_qty, is_available, sku, weight_kg, avg_rating,
      review_count, 
      stores(name, is_active, gmc_merchant_id, gmc_service_account), 
      categories(name)
    `)
    .eq('is_available', true)
    .eq('stores.is_active', true)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (!products?.length) return NextResponse.json({ message: 'No products to sync' })

  // Group by store for multi-account support
  const storesGroups = new Map<string, { products: any[], config?: any }>()
  products.forEach((p: any) => {
    if (!storesGroups.has(p.store_id)) {
      const s = p.stores
      const config = (s?.gmc_merchant_id && s?.gmc_service_account) ? {
        merchantId: s.gmc_merchant_id,
        serviceAccountJson: s.gmc_service_account
      } : undefined
      storesGroups.set(p.store_id, { products: [], config })
    }
    storesGroups.get(p.store_id)!.products.push(p)
  })

  let totalSucceeded = 0
  let totalFailed = 0
  const allErrors: any[] = []
  const allLogEntries: any[] = []
  const allSuccessIds: string[] = []

  for (const [storeId, group] of storesGroups.entries()) {
    const gmcProducts: any[] = group.products.map((p) => ({
      id:           p.id,
      store_id:     p.store_id,
      name:         p.name,
      description:  p.description,
      price:        p.price,
      image_urls:   p.image_urls ?? [],
      stock_qty:    p.stock_qty,
      is_available: p.is_available,
      sku:          p.sku,
      weight_kg:    p.weight_kg,
      avg_rating:   p.avg_rating ?? 0,
      review_count: p.review_count ?? 0,
      category_name: (p.categories as any)?.name,
      store_name:   (p.stores as any)?.name ?? 'Store',
    }))

    const results = await batchSyncProducts(gmcProducts, group.config)
    
    totalSucceeded += results.succeeded
    totalFailed += results.failed
    allErrors.push(...results.errors)

    // Collect success IDs for bulk update
    const successIds = gmcProducts
      .filter((_, i) => !results.errors.find((e) => e.productId === gmcProducts[i].id))
      .map((p) => p.id)
    allSuccessIds.push(...successIds)

    // Create log entries
    gmcProducts.forEach((p) => {
      const err = results.errors.find((e) => e.productId === p.id)
      allLogEntries.push({
        product_id: p.id,
        offer_id:   p.sku ?? p.id,
        action:     'batch',
        status:     err ? 'failed' : 'success',
        error:      err?.error ?? null,
      })
    })
  }

  // Final database updates
  if (allSuccessIds.length > 0) {
    await admin.from('products').update({
      gmc_status: 'synced', gmc_synced_at: new Date().toISOString(),
    }).in('id', allSuccessIds)
  }

  for (let i = 0; i < allLogEntries.length; i += 500) {
    await admin.from('gmc_sync_log').insert(allLogEntries.slice(i, i + 500))
  }

  return NextResponse.json({
    succeeded: totalSucceeded,
    failed:    totalFailed,
    errors:    allErrors,
    total:     products.length,
    timestamp: new Date().toISOString(),
  })
}
