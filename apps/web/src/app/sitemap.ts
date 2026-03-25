import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: APP_URL,                       lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${APP_URL}/stores`,           lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${APP_URL}/search`,           lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${APP_URL}/login`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${APP_URL}/register`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]
}
