const BILLPLZ_BASE = process.env.BILLPLZ_SANDBOX === 'true'
  ? 'https://www.billplz-sandbox.com/api'
  : 'https://www.billplz.com/api'

const BILLPLZ_BILL_BASE = process.env.BILLPLZ_SANDBOX === 'true'
  ? 'https://www.billplz-sandbox.com/bills'
  : 'https://www.billplz.com/bills'

const AUTH = Buffer.from(`${process.env.BILLPLZ_API_KEY}:`).toString('base64')

const HEADERS = {
  'Authorization': `Basic ${AUTH}`,
  'Content-Type': 'application/x-www-form-urlencoded',
}

export interface CreateBillParams {
  orderId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  amountCents: number         // in sen — RM 10.00 = 1000
  description: string
  redirectUrl: string
  callbackUrl: string
}

export interface BillplzBill {
  id: string
  url: string
  paid: boolean
  state: 'due' | 'paid' | 'deleted'
  amount: number
}

export async function createBill(params: CreateBillParams): Promise<BillplzBill> {
  const body = new URLSearchParams({
    collection_id:    process.env.BILLPLZ_COLLECTION_ID!,
    email:            params.customerEmail,
    name:             params.customerName,
    amount:           params.amountCents.toString(),
    description:      params.description,
    callback_url:     params.callbackUrl,
    redirect_url:     params.redirectUrl,
    reference_1_label: 'Order ID',
    reference_1:      params.orderId,
    deliver:          'false',
  })

  if (params.customerPhone) {
    body.set('mobile', params.customerPhone.replace(/[^0-9+]/g, ''))
  }

  const res = await fetch(`${BILLPLZ_BASE}/v3/bills`, {
    method: 'POST',
    headers: HEADERS,
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Billplz error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

export async function getBill(billId: string): Promise<BillplzBill> {
  const res = await fetch(`${BILLPLZ_BASE}/v3/bills/${billId}`, {
    headers: { 'Authorization': `Basic ${AUTH}` },
  })
  return res.json()
}

export async function deleteBill(billId: string): Promise<void> {
  await fetch(`${BILLPLZ_BASE}/v3/bills/${billId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Basic ${AUTH}` },
  })
}

// Verify X-Signature from callback
export function verifyXSignature(params: Record<string, string>): boolean {
  const xSignatureKey = process.env.BILLPLZ_X_SIGNATURE_KEY!
  const crypto = require('crypto')

  // For redirect: sort by key, join with |
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'x_signature')
    .sort()

  const payload = sortedKeys.map((k) => `${k}${params[k]}`).join('|')
  const expected = crypto.createHmac('sha256', xSignatureKey)
    .update(payload).digest('hex')

  return expected === params.x_signature
}

export function getBillUrl(billId: string, bankCode?: string): string {
  const url = `${BILLPLZ_BILL_BASE}/${billId}`
  return bankCode ? `${url}?auto_submit=true` : url
}
