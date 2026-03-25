import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'

export const dynamic    = 'force-dynamic'
export const revalidate = 1800  // 30 min

export async function GET() {
  const admin = createSupabaseAdmin()
  const { data: products } = await admin
    .from('products')
    .select('id, store_id, updated_at, image_urls, name')
    .eq('is_available', true)
    .order('updated_at', { ascending: false })
    .limit(49000)  // Google limit is 50,000 per sitemap

  const urls = (products ?? []).map((p) => {
    const mainImage = p.image_urls?.[0];
    const imageTag = mainImage ? `
    <image:image>
      <image:loc>${mainImage}</image:loc>
      <image:title>${p.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
    </image:image>` : '';

    return `
  <url>
    <loc>${APP_URL}/store/${p.store_id}/product/${p.id}</loc>
    <lastmod>${new Date(p.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${imageTag}
  </url>`;
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
