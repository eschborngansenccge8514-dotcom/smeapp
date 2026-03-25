import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { batchSyncProducts } from '@repo/lib/gmc/productSync'

export async function POST(req: NextRequest) {
  const internalSecret = process.env.INTERNAL_SECRET;
  const receivedSecret = req.headers.get('x-internal-secret');
  
  if (receivedSecret !== internalSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { storeId } = await req.json()
  const admin = createSupabaseAdmin()

  const { data: products } = await admin
    .from('products')
    .select(`
      id, store_id, name, description, price, image_urls,
      stock_qty, is_available, sku, weight_kg, avg_rating,
      review_count, gmc_offer_id,
      stores(name),
      categories(name)
    `)
    .eq('store_id', storeId)
    .eq('is_available', true)

  if (!products || products.length === 0) {
    return NextResponse.json({ succeeded: 0, failed: 0, errors: [] })
  }

  const gmcProducts: any[] = products.map((p) => ({
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

  const results = await batchSyncProducts(gmcProducts)

  // Bulk update product gmc_status
  const successIds = gmcProducts
    .filter((_, i) => !results.errors.find((e) => e.productId === gmcProducts[i].id))
    .map((p) => p.id)

  if (successIds.length > 0) {
    await admin.from('products').update({
      gmc_status: 'synced', gmc_synced_at: new Date().toISOString(),
    }).in('id', successIds)
  }

  // Log sync results
  const logEntries = gmcProducts.map((p) => {
    const err = results.errors.find((e) => e.productId === p.id)
    return {
      product_id: p.id,
      offer_id:   p.sku ?? p.id,
      action:     'batch',
      status:     err ? 'failed' : 'success',
      error:      err?.error ?? null,
    }
  })
  await admin.from('gmc_sync_log').insert(logEntries)

  return NextResponse.json(results)
}
