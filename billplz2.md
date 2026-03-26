<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# function getBase() {

return process.env.BILLPLZ_SANDBOX === 'true'
? 'https://www.billplz-sandbox.com/api'
: 'https://www.billplz.com/api'
}

function getBillBase() {
return process.env.BILLPLZ_SANDBOX === 'true'
? 'https://www.billplz-sandbox.com/bills'
: 'https://www.billplz.com/bills'
}

function getAuth() {
const apiKey = process.env.BILLPLZ_API_KEY
if (!apiKey) {
console.error('BILLPLZ_API_KEY is missing from environment variables')
}
return Buffer.from(`${apiKey || ''}:`).toString('base64')
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
const url = `${getBillBase()}/${billId}`
return bankCode ? `${url}?auto_submit=true` : url
}

The code itself is **structurally correct** — the bug is that `getAuth()` **silently fails** and sends a blank key. When `BILLPLZ_API_KEY` is `undefined`, it encodes just `":"` to Base64 (`Og==`) and sends `Authorization: Basic Og==` — which Billplz immediately rejects as `Access denied`.

***

## The Silent Failure in `getAuth()`

```ts
function getAuth() {
  const apiKey = process.env.BILLPLZ_API_KEY
  if (!apiKey) {
    console.error('BILLPLZ_API_KEY is missing') // ⚠️ logs, but doesn't stop execution
  }
  return Buffer.from(`${apiKey || ''}:`).toString('base64')
  //                  ^^^^^^^^^^^^^ empty string → encodes ":" → "Og=="
}
```

The `console.error` warns you but the function still returns `Basic Og==` to Billplz. **Check your terminal right now** — you almost certainly have `BILLPLZ_API_KEY is missing` already printed there.

***

## Fix 1: Throw Early on Missing Env Vars

Make the failure loud and explicit instead of silent:

```ts
function getAuth() {
  const apiKey = process.env.BILLPLZ_API_KEY
  if (!apiKey) throw new Error('BILLPLZ_API_KEY is not set in environment variables')
  return Buffer.from(`${apiKey}:`).toString('base64')
}
```

Also guard `BILLPLZ_COLLECTION_ID` and `BILLPLZ_SANDBOX` at startup:

```ts
// Add this at the top of client.ts — runs once on import
const REQUIRED_ENV = ['BILLPLZ_API_KEY', 'BILLPLZ_COLLECTION_ID', 'BILLPLZ_X_SIGNATURE_KEY']
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`)
}
```


***

## Fix 2: Ensure Your `.env.local` Has All 4 Keys

```bash
# .env.local — must be in your Next.js app root (where package.json is)
BILLPLZ_SANDBOX=true
BILLPLZ_API_KEY=your-sandbox-api-key-here
BILLPLZ_COLLECTION_ID=your-collection-id-here
BILLPLZ_X_SIGNATURE_KEY=your-x-signature-key-here
```

> `BILLPLZ_SANDBOX` must be the string `"true"` exactly — your `getBase()` checks `=== 'true'`. If it's missing or `"True"`, it silently falls back to the **production** URL while you're using a **sandbox key** — which also causes `Access denied`.

***

## Fix 3: One Additional Bug — `getBillUrl`

There is a minor bug in `getBillUrl` — the bank code is passed but never appended to the URL:

```ts
// ❌ Current — bankCode is checked but never used in the URL
export function getBillUrl(billId: string, bankCode?: string): string {
  const url = `${getBillBase()}/${billId}`
  return bankCode ? `${url}?auto_submit=true` : url
}

// ✅ Fixed — append the bank code as a query param
export function getBillUrl(billId: string, bankCode?: string): string {
  const url = `${getBillBase()}/${billId}`
  return bankCode ? `${url}?bank_code=${bankCode}&auto_submit=true` : url
}
```


***

## Quick Diagnosis Right Now

Add this one line temporarily at the top of your `route.ts`:

```ts
// src/app/api/checkout/create-order/route.ts
console.log('ENV CHECK:', {
  hasKey: !!process.env.BILLPLZ_API_KEY,
  isSandbox: process.env.BILLPLZ_SANDBOX,
  hasCollection: !!process.env.BILLPLZ_COLLECTION_ID,
})
```

If `hasKey: false` appears in your terminal — your `.env.local` is either missing, in the wrong directory, or the server hasn't been restarted after editing it. **Restart the dev server** with `Ctrl+C` then `npm run dev` after any `.env.local` change.

