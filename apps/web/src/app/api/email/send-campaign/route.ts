import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmailCampaign } from '@/lib/resend'

export async function POST(req: Request) {
  try {
    const { campaignId } = await req.json()
    const supabase        = await createClient()

    // 1. Fetch campaign details
    const { data: campaign, error: campError } = await supabase
      .from('email_campaigns')
      .select('*, stores!inner(*)')
      .eq('id', campaignId)
      .single()

    if (campError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // 2. Fetch recipients
    let query = supabase
      .from('crm_contacts')
      .select('*')
      .eq('store_id', campaign.store_id)
      .eq('is_subscribed', true)

    if (campaign.segment_id) {
       // Simple segment matching by string for now
       query = query.eq('segment', campaign.segment_id)
    }

    const { data: recipients, error: recError } = await query
    if (recError || !recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
    }

    // 3. Update status to sending
    await supabase
      .from('email_campaigns')
      .update({ status: 'sending', total_recipients: recipients.length })
      .eq('id', campaignId)

    // 4. Send emails
    const { sent, failed } = await sendEmailCampaign({
      fromName:   campaign.from_name || campaign.stores.name,
      fromEmail:  campaign.from_email || 'marketing@yourdomain.com',
      replyTo:    campaign.reply_to,
      subject:    campaign.subject,
      bodyHtml:   campaign.body_html,
      bodyText:   campaign.body_text,
      campaignId: campaign.id,
      recipients: recipients.map((r) => ({
        email: r.email!,
        name:  r.full_name,
      })),
    })

    // 5. Final update
    await supabase
      .from('email_campaigns')
      .update({
        status:     'sent',
        sent_at:    new Date().toISOString(),
        sent_count: sent,
      })
      .eq('id', campaignId)

    return NextResponse.json({ success: true, sent, failed })
  } catch (error: any) {
    console.error('Campaign sending error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
