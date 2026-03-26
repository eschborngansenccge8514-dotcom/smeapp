import { Resend } from 'resend'

let resendInstance: Resend | null = null

export function getResend() {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is missing')
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY || 're_dummy_key')
  }
  return resendInstance
}

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
      const resendInstance = getResend()
      const { data, error } = await resendInstance.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [r.email],
        replyTo: replyTo,
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
