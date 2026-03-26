import crypto from 'crypto'
// Add this at the top of client.ts — runs once on import

const REQUIRED_ENV = ['BILLPLZ_API_KEY', 'BILLPLZ_COLLECTION_ID', 'BILLPLZ_X_SIGNATURE_KEY']
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) console.warn(`Missing required env var: ${key}`)
}

function getBase() {
  return process.env.BILLPLZ_SANDBOX === 'true'
    ? 'https://www.billplz-sandbox.com/api'
    : 'https://www.billplz.com/api'
}

function getBillBase() {
  return process.env.BILLPLZ_SANDBOX === 'true'
    ? 'https://www.billplz-sandbox.com/bills'
    : 'https://www.billplz.com/bills'
}

export function getAuth() {
  const apiKey = process.env.BILLPLZ_API_KEY
  if (!apiKey) {
    throw new Error('BILLPLZ_API_KEY is not set in environment variables')
  }
  return Buffer.from(`${apiKey}:`).toString('base64')
}

function getHeaders() {
  return {
    'Authorization': `Basic ${getAuth()}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
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

  const res = await fetch(`${getBase()}/v3/bills`, {
    method: 'POST',
    headers: getHeaders(),
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Billplz error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

export async function getBill(billId: string): Promise<BillplzBill> {
  const res = await fetch(`${getBase()}/v3/bills/${billId}`, {
    headers: { 'Authorization': `Basic ${getAuth()}` },
  })
  return res.json()
}

export async function deleteBill(billId: string): Promise<void> {
  await fetch(`${getBase()}/v3/bills/${billId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Basic ${getAuth()}` },
  })
}

// Verify X-Signature from callback or redirect
export function verifyXSignature(params: Record<string, string>): boolean {
  const xSignatureKey = process.env.BILLPLZ_X_SIGNATURE_KEY!
  if (!xSignatureKey) return false

  // Billplz v3 Redirect uses billplz[...] or billplz_... prefix.
  // We normalize keys (e.g. billplz[id] -> id) before sorting/signing
  // so the logic is consistent for both webhook and redirect.
  const normalized: Record<string, string> = {}
  for (const k in params) {
    if (k === 'x_signature') continue
    let key = k
    if (k.startsWith('billplz[')) key = k.slice(8, -1)
    else if (k.startsWith('billplz_')) key = k.slice(8)
    normalized[key] = params[k]
  }

  const sortedKeys = Object.keys(normalized).sort()
  const payload = sortedKeys.map((k) => `${k}${normalized[k]}`).join('|')
  
  const expected = crypto.createHmac('sha256', xSignatureKey)
    .update(payload).digest('hex')

  return expected === params.x_signature
}


export function getBillUrl(billId: string, bankCode?: string): string {
  const url = `${getBillBase()}/${billId}`
  return bankCode ? `${url}?bank_code=${bankCode}&auto_submit=true` : url
}
