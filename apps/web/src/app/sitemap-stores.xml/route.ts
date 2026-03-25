import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'

export const dynamic   = 'force-dynamic'
export const revalidate = 3600  // 1 hour

export async function GET() {
  const admin = createSupabaseAdmin()
  const { data: stores } = await admin
    .from('stores')
    .select('id, updated_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const urls = (stores ?? []).map((s) => `
  <url>
    <loc>${APP_URL}/store/${s.id}</loc>
    <lastmod>${new Date(s.updated_at).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
