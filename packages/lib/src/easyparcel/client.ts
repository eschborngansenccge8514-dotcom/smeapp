const BASE    = 'https://api.easyparcel.com'
const API_KEY = process.env.EASYPARCEL_API_KEY!

export interface EasyParcelRate {
  service_id:    string
  courier_name:  string
  courier_logo:  string
  service_name:  string
  price:         number
  delivery_time: string
}

export async function getEasyParcelRates(params: {
  fromPostcode: string; fromState: string
  toPostcode:   string; toState:   string
  weight:       number
}): Promise<EasyParcelRate[]> {
  const res = await fetch(`${BASE}/uc/shipment/shippingRate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key:      API_KEY,
      bulk: [{
        from_postcode: params.fromPostcode,
        from_state:    params.fromState,
        from_country:  'MY',
        to_postcode:   params.toPostcode,
        to_state:      params.toState,
        to_country:    'MY',
        weight:        params.weight.toString(),
        parcel_type:   'parcel',
      }],
    }),
  })
  const data = await res.json()
  if (data.status !== 'success') throw new Error(data.message)
  return data.result?.[0]?.rates ?? []
}

export async function bookEasyParcel(params: {
  serviceId:     string
  courierName:   string
  senderName:    string; senderPhone: string; senderAddress: string
  senderPostcode: string; senderState: string
  recipientName: string; recipientPhone: string; recipientAddress: string
  recipientPostcode: string; recipientState: string
  weight:        number; content: string; value: number
}) {
  const res = await fetch(`${BASE}/uc/shipment/submitShipment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: API_KEY,
      bulk: [{
        service_id:     params.serviceId,
        weight:         params.weight.toString(),
        content:        params.content,
        value:          params.value.toString(),
        send_name:      params.senderName,
        send_phone:     params.senderPhone,
        send_addr1:     params.senderAddress,
        send_postcode:  params.senderPostcode,
        send_state:     params.senderState,
        send_country:   'MY',
        rec_name:       params.recipientName,
        rec_phone:      params.recipientPhone,
        rec_addr1:      params.recipientAddress,
        rec_postcode:   params.recipientPostcode,
        rec_state:      params.recipientState,
        rec_country:    'MY',
        collect_date:   new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10),
      }],
    }),
  })
  const data = await res.json()
  if (data.status !== 'success') throw new Error(data.message)
  return data.result?.[0]
}
