import { notFound } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { DisputeDetail } from '@/components/admin/disputes/DisputeDetail'

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const [{ data: dispute }, { data: messages }] = await Promise.all([
    supabase
      .from('disputes')
      .select(`
        *,
        orders(*, stores(name, logo_url), order_items(*, products(name))),
        profiles!raised_by(full_name, phone, role)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('dispute_messages')
      .select('*, profiles(full_name, role)')
      .eq('dispute_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!dispute) notFound()

  return <DisputeDetail dispute={dispute} messages={messages ?? []} />
}
