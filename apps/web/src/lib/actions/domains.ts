'use server'

import { createClient }   from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const VERCEL_TOKEN      = process.env.VERCEL_ACCESS_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID
const VERCEL_TEAM_ID    = process.env.VERCEL_TEAM_ID

async function vercelFetch(path: string, options: RequestInit = {}) {
  const url = `https://api.vercel.com${path}${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return res.json()
}

/**
 * Add a custom domain to the Vercel project
 */
export async function addCustomDomain(storeId: string, domain: string) {
  const supabase = await createClient()
  
  // 1. Add to Vercel
  const result = await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: domain }),
  })

  if (result.error) {
    if (result.error.code === 'domain_already_in_use') {
      // Ignore if already added to this project
    } else {
      return { success: false, error: result.error.message }
    }
  }

  // 2. Generate a verification token (TXT record value)
  // Vercel provides this in the response usually, or we can use a custom one 
  // if we use Vercel's domain verification flow.
  const txtRecord = result.verification?.[0]?.value || `vc-domain-verify=${storeId}`

  // 3. Update DB
  const { error } = await supabase
    .from('stores')
    .update({
      custom_domain: domain,
      domain_verified: false,
      domain_txt_record: txtRecord,
    })
    .eq('id', storeId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/merchant/brand-settings')
  return { success: true, txtRecord }
}

/**
 * Check if the domain is verified on Vercel
 */
export async function verifyCustomDomain(storeId: string) {
  const supabase = await createClient()
  const { data: store } = await supabase
    .from('stores')
    .select('custom_domain')
    .eq('id', storeId)
    .single()

  if (!store?.custom_domain) return { verified: false, error: 'No domain configured' }

  // 1. Ask Vercel to verify
  const result = await vercelFetch(
    `/v9/projects/${VERCEL_PROJECT_ID}/domains/${store.custom_domain}/verify`,
    { method: 'POST' }
  )

  // 2. Poll Vercel for status
  const status = await vercelFetch(
    `/v9/projects/${VERCEL_PROJECT_ID}/domains/${store.custom_domain}`
  )

  const isVerified = status.verified === true

  if (isVerified) {
    await supabase
      .from('stores')
      .update({
        domain_verified: true,
        domain_verified_at: new Date().toISOString(),
      })
      .eq('id', storeId)
  }

  revalidatePath('/merchant/brand-settings')
  return { verified: isVerified, error: result.error?.message }
}

/**
 * Remove a custom domain
 */
export async function removeCustomDomain(storeId: string) {
  const supabase = await createClient()
  const { data: store } = await supabase
    .from('stores')
    .select('custom_domain')
    .eq('id', storeId)
    .single()

  if (store?.custom_domain) {
    // Remove from Vercel
    await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${store.custom_domain}`, {
      method: 'DELETE',
    })
  }

  // Reset in DB
  await supabase
    .from('stores')
    .update({
      custom_domain: null,
      domain_verified: false,
      domain_verified_at: null,
      domain_txt_record: null,
    })
    .eq('id', storeId)

  revalidatePath('/merchant/brand-settings')
  return { success: true }
}
