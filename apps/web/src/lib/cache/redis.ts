import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// ─── Generic cached fetch ──────────────────────────────────────────────────
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 60
): Promise<T> {
  const cached = await redis.get<T>(key)
  if (cached !== null) return cached

  const data = await fetcher()
  await redis.setex(key, ttlSeconds, JSON.stringify(data))
  return data
}

// ─── Batch get/set ──────────────────────────────────────────────────────────
export async function cachedBatch<T>(
  keys: string[],
  fetcher: (missingKeys: string[]) => Promise<Record<string, T>>,
  ttlSeconds = 60
): Promise<Record<string, T>> {
  if (keys.length === 0) return {}

  const pipeline = redis.pipeline()
  keys.forEach((k) => pipeline.get(k))
  const results = await pipeline.exec<(T | null)[]>()

  const result: Record<string, T> = {}
  const missing: string[] = []

  results.forEach((val, i) => {
    if (val !== null) result[keys[i]] = val as T
    else missing.push(keys[i])
  })

  if (missing.length > 0) {
    const fresh = await fetcher(missing)
    const setPipeline = redis.pipeline()
    Object.entries(fresh).forEach(([k, v]) => {
      result[k] = v
      setPipeline.setex(k, ttlSeconds, JSON.stringify(v))
    })
    await setPipeline.exec()
  }

  return result
}

// ─── Tag-based invalidation ──────────────────────────────────────────────────
export async function invalidateTags(tags: string[]): Promise<void> {
  for (const tag of tags) {
    const keys = await redis.smembers(`tag:${tag}`)
    if (keys.length > 0) {
      const pipeline = redis.pipeline()
      keys.forEach((k) => pipeline.del(k))
      pipeline.del(`tag:${tag}`)
      await pipeline.exec()
    }
  }
}

export async function setWithTags(
  key: string,
  value: unknown,
  ttlSeconds: number,
  tags: string[]
): Promise<void> {
  const pipeline = redis.pipeline()
  pipeline.setex(key, ttlSeconds, JSON.stringify(value))
  tags.forEach((tag) => pipeline.sadd(`tag:${tag}`, key))
  await pipeline.exec()
}
