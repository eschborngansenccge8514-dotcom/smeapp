import { createClient } from '@/lib/supabase/server'

export type NotificationType = 'new_order' | 'low_stock' | 'review' | 'payment' | 'system' | 'promo'

interface TriggerOptions {
  storeId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
  metadata?: Record<string, any>
}

/**
 * Triggers a notification for a merchant.
 * Checks merchant preferences before inserting.
 */
export async function triggerNotification({
  storeId,
  type,
  title,
  body,
  link,
  metadata = {},
}: TriggerOptions) {
  const supabase = await createClient()

  // 1. Check merchant preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('store_id', storeId)
    .maybeSingle()

  // Default to enabled if no prefs found (or if specific push is enabled)
  const isEnabled = prefs ? prefs[`${type}_push`] ?? true : true

  if (!isEnabled) {
    console.log(`[Notification] Skipped ${type} for store ${storeId} due to preferences.`)
    return { skipped: true }
  }

  // 2. Check quiet hours if enabled
  if (prefs?.quiet_hours_enabled) {
    const now = new Date()
    const hours = now.getHours()
    // Simple quiet hours (e.g. 10 PM to 8 AM)
    if (hours >= 22 || hours < 8) {
      console.log(`[Notification] Muted ${type} for store ${storeId} during quiet hours.`)
      // We might still want to insert the notification but not send a push?
      // For now, let's just proceed with insertion so they see it in their dashboard later.
    }
  }

  // 3. Insert notification
  const { data, error } = await supabase
    .from('merchant_notifications')
    .insert({
      store_id: storeId,
      type,
      title,
      body: body || null,
      link: link || null,
      metadata,
      is_read: false,
      is_archived: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[Notification] Error triggering notification:', error)
    throw error
  }

  return { success: true, notification: data }
}
