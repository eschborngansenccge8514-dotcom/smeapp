import crypto from 'crypto'

const BASE = process.env.LALAMOVE_SANDBOX === 'true'
  ? 'https://rest.sandbox.lalamove.com'
  : 'https://rest.lalamove.com'

const API_KEY    = process.env.LALAMOVE_API_KEY!
const API_SECRET = process.env.LALAMOVE_API_SECRET!
const MARKET     = 'MY'

function sign(method: string, path: string, body: string): string {
  const timestamp = Date.now().toString()
  const rawSig = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`
  const signature = crypto.createHmac('sha256', API_SECRET).update(rawSig).digest('hex')
  return `hmac ${API_KEY}:${timestamp}:${signature}`
}

async function lalamoveRequest(method: string, path: string, body?: object) {
  const bodyStr = body ? JSON.stringify(body) : ''
  const auth = sign(method, path, bodyStr)
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': auth,
      'Market':        MARKET,
    },
    body: bodyStr || undefined,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Lalamove error: ${JSON.stringify(err)}`)
  }
  return res.json()
}

export interface LalamoveQuoteParams {
  fromLat: number; fromLng: number; fromAddress: string
  toLat: number;   toLng: number;   toAddress: string
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK550'
}

export async function getLalamoveQuote(params: LalamoveQuoteParams) {
  const body = {
    data: {
      serviceType: params.vehicleType ?? 'MOTORCYCLE',
      stops: [
        {
          coordinates: { lat: params.fromLat.toString(), lng: params.fromLng.toString() },
          address: params.fromAddress,
        },
        {
          coordinates: { lat: params.toLat.toString(), lng: params.toLng.toString() },
          address: params.toAddress,
        },
      ],
      deliveries: [
        {
          toStop: 1,
          toContact: { name: 'Customer', phone: '+60123456789' },
          remarks: '',
        },
      ],
    },
  }
  return lalamoveRequest('POST', '/v3/quotations', body)
}

export async function placeLalamoveOrder(params: {
  quotationId: string
  senderName: string; senderPhone: string
  recipientName: string; recipientPhone: string
  remarks?: string
}) {
  const body = {
    data: {
      quotationId: params.quotationId,
      sender: {
        stopIndex: '0',
        name:      params.senderName,
        phone:     params.senderPhone,
      },
      recipients: [
        {
          stopIndex: '1',
          name:      params.recipientName,
          phone:     params.recipientPhone,
          remarks:   params.remarks ?? '',
        },
      ],
      isPODEnabled: false,
    },
  }
  return lalamoveRequest('POST', '/v3/orders', body)
}

export async function getLalamoveOrderStatus(orderId: string) {
  return lalamoveRequest('GET', `/v3/orders/${orderId}`)
}

export async function getLalamoveDriverLocation(orderId: string) {
  return lalamoveRequest('GET', `/v3/orders/${orderId}/driverLocation`)
}
