import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { syncProduct, deleteGMCProduct } from '@repo/lib/gmc/productSync'

export async function POST(req: NextRequest) {
  // Internal-only route
  const internalSecret = process.env.INTERNAL_SECRET;
  const receivedSecret = req.headers.get('x-internal-secret');
  
  if (receivedSecret !== internalSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { productId, action = 'upsert' } = await req.json()
  const admin = createSupabaseAdmin()

  const { data: product } = await admin
    .from('products')
    .select(`
      id, store_id, name, description, price, image_urls,
      stock_qty, is_available, sku, weight_kg,
      avg_rating, review_count, gmc_offer_id,
      stores(name, gmc_merchant_id, gmc_service_account),
      categories(name)
    `)
    .eq('id', productId)
    .single()

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const gmcProduct: any = {
    id:           product.id,
    store_id:     product.store_id,
    name:         product.name,
    description:  product.description,
    price:        product.price,
    image_urls:   product.image_urls ?? [],
    stock_qty:    product.stock_qty,
    is_available: product.is_available,
    sku:          product.sku,
    weight_kg:    product.weight_kg,
    avg_rating:   product.avg_rating ?? 0,
    review_count: product.review_count ?? 0,
    category_name: (product.categories as any)?.name,
    store_name:   (product.stores as any)?.name ?? 'Store',
  }

  const storeData = product.stores as any
  const config = (storeData?.gmc_merchant_id && storeData?.gmc_service_account) ? {
    merchantId: storeData.gmc_merchant_id,
    serviceAccountJson: storeData.gmc_service_account
  } : undefined

  try {
    let result: any

    if (action === 'delete') {
      const offerId = product.gmc_offer_id ?? product.id
      const ok = await deleteGMCProduct(offerId, config)
      result = { success: ok, offerId }
    } else {
      result = await syncProduct(gmcProduct, config)
    }

    // Update product GMC status
    await admin.from('products').update({
      gmc_status:    result.success ? 'synced' : 'failed',
      gmc_synced_at: new Date().toISOString(),
      gmc_offer_id:  result.offerId,
    }).eq('id', productId)

    // Log the result
    await admin.from('gmc_sync_log').insert({
      product_id: productId,
      offer_id:   result.offerId,
      action:     action === 'delete' ? 'delete' : 'update',
      status:     result.success ? 'success' : 'failed',
      gmc_name:   result.gmcName ?? null,
      error:      result.error ?? null,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
