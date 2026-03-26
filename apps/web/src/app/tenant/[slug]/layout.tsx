import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TenantThemeProvider } from '@/components/tenant/TenantThemeProvider'
import { StoreNavbar } from '@/components/tenant/StoreNavbar'
import { getTenantContext } from '@/lib/tenant'
import { CartProvider } from '@/contexts/CartProvider'

export default async function TenantLayout({
  children, params: paramsPromise
}: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const params = await paramsPromise
  const supabase = await createClient()
  const { data: store } = await supabase
    .from('stores')
    .select('*, slug, name, primary_color, app_name, font_family, logo_url')
    .or(`slug.eq.${params.slug},custom_domain.eq.${params.slug}`)
    .eq('is_active', true)
    .single()

  if (!store) notFound()

  const { isTenant } = await getTenantContext()

  return (
    <TenantThemeProvider 
      primaryColor={store.primary_color ?? '#6366F1'} 
      fontFamily={store.font_family ?? 'Inter'}
    >
      <CartProvider
        key={`cart-${store.slug}`}
        storeSlug={store.slug}
        storeId={store.id}
      >
        <div className="min-h-screen flex flex-col bg-white">
          <StoreNavbar store={store} isTenant={isTenant} />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </CartProvider>
    </TenantThemeProvider>
  )
}
