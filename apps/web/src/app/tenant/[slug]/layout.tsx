import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function TenantLayout({
  children, params: paramsPromise
}: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const params = await paramsPromise
  const supabase = await createClient()
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, brand_primary_color, brand_app_name')
    .or(`brand_subdomain.eq.${params.slug},brand_custom_domain.eq.${params.slug}`)
    .eq('is_active', true)
    .single()

  if (!store) notFound()

  const primary = store.brand_primary_color ?? '#6366F1'

  return (
    <>
      <style>{`:root { --brand-primary: ${primary}; }`}</style>
      {children}
    </>
  )
}
