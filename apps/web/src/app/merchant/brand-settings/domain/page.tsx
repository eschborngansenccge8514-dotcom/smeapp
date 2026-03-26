import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { DomainSettingsClient } from './DomainSettingsClient'

export const metadata = { title: 'Domain Settings' }

export default async function DomainSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id, slug, name, custom_domain, domain_verified, domain_txt_record, subdomain_active')
    .eq('owner_id', user.id)
    .single()

  if (!store) redirect('/onboarding')

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mymarket.com'

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
       <DomainSettingsClient
         store={store}
         rootDomain={rootDomain}
       />
    </div>
  )
}
