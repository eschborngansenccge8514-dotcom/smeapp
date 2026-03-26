import { redis, invalidateTags } from './redis'
import { CacheKeys, CacheTags } from './keys'

// Call after a product is created / updated / deleted
export async function invalidateProductCache(storeId: string, productId?: string) {
  const pipeline = redis.pipeline()
  if (productId) pipeline.del(CacheKeys.product(productId))
  pipeline.del(CacheKeys.storeCategories(storeId))
  pipeline.del(CacheKeys.featuredProducts(storeId))
  // Wipe all paginated product caches for this store
  const keys = await redis.keys(`store:${storeId}:products:*`)
  keys.forEach((k) => pipeline.del(k))
  const catKeys = await redis.keys(`store:${storeId}:cat:*`)
  catKeys.forEach((k) => pipeline.del(k))
  await pipeline.exec()
}

// Call after a new order is placed
export async function invalidateOrderCache(storeId: string, orderId?: string) {
  const pipeline = redis.pipeline()
  pipeline.del(CacheKeys.dashboardStats(storeId))
  pipeline.del(CacheKeys.crmStats(storeId))
  if (orderId) pipeline.del(CacheKeys.orderById(orderId))
  const keys = await redis.keys(`orders:store:${storeId}:*`)
  keys.forEach((k) => pipeline.del(k))
  await pipeline.exec()
  await invalidateTags([CacheTags.orders(storeId), CacheTags.crm(storeId)])
}

// Call after store settings change
export async function invalidateStoreCache(storeId: string, slug: string) {
  const pipeline = redis.pipeline()
  pipeline.del(CacheKeys.storeById(storeId))
  pipeline.del(CacheKeys.store(slug))
  pipeline.del(CacheKeys.storeHours(storeId))
  await pipeline.exec()
  await invalidateTags([CacheTags.store(storeId)])
}
