import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendCampaignOptions {
  fromName: string
  fromEmail: string
  replyTo?: string
  subject: string
  bodyHtml: string
  bodyText?: string
  recipients: { email: string; name: string; [key: string]: string }[]
  campaignId: string
}

export async function sendEmailCampaign({
  fromName, fromEmail, replyTo, subject, bodyHtml,
  bodyText, recipients, campaignId,
}: SendCampaignOptions) {
  const results = await Promise.allSettled(
    recipients.map(async (r) => {
      // Personalise placeholders: {{name}}, {{email}}, etc.
      const personalised = Object.entries(r).reduce(
        (html, [key, val]) => html.replaceAll(`{{${key}}}`, val),
        bodyHtml
      )
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [r.email],
        reply_to: replyTo,
        subject,
        html: personalised,
        text: bodyText,
        headers: {
          'X-Campaign-ID': campaignId,
          'List-Unsubscribe': `<mailto:unsubscribe@yourapp.com?subject=unsubscribe-${campaignId}>`,
        },
      })
      if (error) throw error
      return data
    })
  )
  const sent     = results.filter((r) => r.status === 'fulfilled').length
  const failed   = results.filter((r) => r.status === 'rejected').length
  return { sent, failed }
}
