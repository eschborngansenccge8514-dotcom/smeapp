import { notFound }                              from 'next/navigation'
import { getStoreBySlug, getTenantContext }       from '@/lib/tenant'
import { CartProvider }                          from '@/contexts/CartProvider'
import { TenantThemeProvider }                   from '@/components/tenant/TenantThemeProvider'
import { StoreNavbar }                           from '@/components/tenant/StoreNavbar'

interface Props {
  children: React.ReactNode
  params:   Promise<{ slug: string }>
}

export default async function StoreLayout({ children, params }: Props) {
  const { slug }        = await params
  const store           = await getStoreBySlug(slug)
  if (!store) notFound()

  const { isTenant } = await getTenantContext()

  return (
    // TenantThemeProvider injects CSS vars for this store's brand
    <TenantThemeProvider
      primaryColor={store.primary_color ?? '#6366f1'}
      fontFamily={store.font_family    ?? 'Inter'}
    >
      {/*
        CartProvider is keyed to storeSlug + storeId.
        When a user navigates to a DIFFERENT store's layout,
        React unmounts this provider and mounts a fresh one —
        completely separate cart state.
      */}
      <CartProvider
        key={`cart-${store.slug}`}   // force remount on store change
        storeSlug={store.slug}
        storeId={store.id}
      >
        <div className="min-h-screen flex flex-col bg-white" data-store={slug}>
          <StoreNavbar store={store} isTenant={isTenant} />
          <main className="flex-1">{children}</main>
        </div>
      </CartProvider>
    </TenantThemeProvider>
  )
}
