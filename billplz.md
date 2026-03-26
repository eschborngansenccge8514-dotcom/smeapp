<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# create-order error: Error: Billplz error: {"error":{"type":"Unauthorized","message":["Access denied"]}}

    at createBill (../../packages/lib/src/billplz/client.ts:61:11)
    at async POST (src/app/api/checkout/create-order/route.ts:99:18)
    59 |   if (!res.ok) {
60 |     const err = await res.json()
> 61 |     throw new Error(`Billplz error: ${JSON.stringify(err)}`)
|           ^
62 |   }
63 |
64 |   return res.json()
POST /api/checkout/create-order 500 in 3.5s (next.js: 79ms, proxy.ts: 265ms, application-code: 3.2s)

This is **not** a server crash — your code is working correctly. The 500 is thrown intentionally at line 61 because Billplz returned `{"error":{"type":"Unauthorized","message":["Access denied"]}}`, meaning **Billplz rejected your API key**. The fix is purely an authentication configuration issue.

***

## Root Cause: API Key Authentication Failure

Billplz uses **HTTP Basic Auth** where your API Secret Key is the username and the password is blank. If the key is missing, malformed, or from the wrong environment, Billplz returns `Access denied` immediately.

***

## Fix Your `client.ts`

Open `packages/lib/src/billplz/client.ts` and check how you're sending the auth header. It must be:

```ts
// ✅ Correct Basic Auth for Billplz
const apiKey = process.env.BILLPLZ_API_KEY ?? "";

const res = await fetch(`${baseUrl}/bills`, {
  method: "POST",
  headers: {
    "Authorization": `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams(payload),
});
```

The **colon after the key** (`apiKey + ":"`) is mandatory — it signals an empty password to Basic Auth. Missing it is the most common cause of this exact error.

***

## Checklist to Resolve

### 1. Verify Your `.env.local` Has the Key

```bash
# .env.local (Next.js)
BILLPLZ_API_KEY=your_secret_key_here
BILLPLZ_COLLECTION_ID=your_collection_id_here
BILLPLZ_BASE_URL=https://www.billplz-sandbox.com/api/v3  # or production
```

After editing `.env.local`, **restart your Next.js dev server** — Next.js does not hot-reload env changes.

### 2. Confirm the Key Is Actually Loaded

Add a temporary log in your `route.ts` before the `createBill` call:

```ts
// src/app/api/checkout/create-order/route.ts  — temporary debug line
console.log("API KEY loaded:", !!process.env.BILLPLZ_API_KEY);
```

If it logs `false` or `undefined`, your `.env.local` is not being read. Make sure the file is in your **project root** (same level as `package.json`), not inside `src/`.

### 3. Match Keys to the Right Environment

| If `BILLPLZ_BASE_URL` is... | Use API key from... |
| :-- | :-- |
| `billplz-sandbox.com` | Billplz **Sandbox** dashboard |
| `billplz.com` | Billplz **Production** dashboard |

Mixing a sandbox key with the production URL (or vice versa) causes exactly this `Access denied` error.

### 4. Re-copy the Key Cleanly

Go to your Billplz dashboard → **Settings → API** and re-copy the key. Watch for:

- Leading/trailing **whitespace** when pasting
- The key being accidentally **truncated** in your `.env` file
- Quotes around the value (e.g., `BILLPLZ_API_KEY="abc123"` — remove the quotes in `.env.local`)

***

## Quick Sanity Test

Bypass your app entirely and test the key directly in terminal:

```bash
curl https://www.billplz-sandbox.com/api/v3/collections \
  -u YOUR_API_KEY_HERE:
```

- ✅ Returns a JSON list → key is valid, the bug is in how your code sends it
- ❌ Returns `Access denied` → the key itself is wrong or from the wrong environment

