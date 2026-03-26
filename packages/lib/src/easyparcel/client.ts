const BASE    = 'https://connect.easyparcel.my/?ac='
const DEMO    = 'https://demo.connect.easyparcel.my/?ac='
const API_KEY = process.env.EASYPARCEL_API_KEY!
const IS_DEMO = process.env.EASYPARCEL_SANDBOX === 'true' || !process.env.EASYPARCEL_SANDBOX

function getBaseUrl() {
  return IS_DEMO ? DEMO : BASE
}

/** Maps full Malaysian state names → EasyParcel 3-letter state codes */
const STATE_CODES: Record<string, string> = {
  'Johor':            'jhr',
  'Kedah':            'kdh',
  'Kelantan':         'ktn',
  'Kuala Lumpur':     'kul',
  'Labuan':           'lbn',
  'Melaka':           'mlk',
  'Negeri Sembilan':  'nsn',
  'Pahang':           'phg',
  'Penang':           'png',
  'Perak':            'prk',
  'Perlis':           'pls',
  'Putrajaya':        'pjy',
  'Sabah':            'sbh',
  'Sarawak':          'srw',
  'Selangor':         'sgr',
  'Terengganu':       'trg',
}

function toStateCode(state: string): string {
  return STATE_CODES[state] ?? state.substring(0, 3).toLowerCase()
}

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
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)
  const body = new URLSearchParams({
    'api': API_KEY,
    'bulk[0][pick_code]':    params.fromPostcode,
    'bulk[0][pick_state]':   toStateCode(params.fromState),
    'bulk[0][pick_country]': 'MY',
    'bulk[0][send_code]':    params.toPostcode,
    'bulk[0][send_state]':   toStateCode(params.toState),
    'bulk[0][send_country]': 'MY',
    'bulk[0][weight]':       params.weight.toString(),
    'bulk[0][width]':        '0',
    'bulk[0][length]':       '0',
    'bulk[0][height]':       '0',
    'bulk[0][date_coll]':    tomorrow,
  })

  const res = await fetch(`${getBaseUrl()}EPRateCheckingBulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const text = await res.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('EasyParcel returned non-JSON response')
  }

  if (data.api_status !== 'Success') {
    throw new Error(data.error_remark || 'EasyParcel rate check failed')
  }

  const rates: any[] = data.result?.[0]?.rates ?? []
  return rates.map((r) => ({
    service_id:    r.service_id,
    courier_name:  r.courier_name?.replace(/&amp;/g, '&'),
    courier_logo:  r.courier_logo,
    service_name:  r.service_name?.replace(/&amp;/g, '&'),
    price:         parseFloat(r.price),
    delivery_time: r.delivery,
  }))
}

export async function bookEasyParcel(params: {
  serviceId:         string
  courierName:       string
  senderName:        string; senderPhone: string; senderAddress: string
  senderPostcode:    string; senderState: string
  recipientName:     string; recipientPhone: string; recipientAddress: string
  recipientPostcode: string; recipientState: string
  weight:            number; content: string; value: number
}) {
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)
  const body = new URLSearchParams({
    'api': API_KEY,
    'bulk[0][service_id]':      params.serviceId,
    'bulk[0][weight]':          params.weight.toString(),
    'bulk[0][content]':         params.content,
    'bulk[0][value]':           params.value.toString(),
    'bulk[0][send_name]':       params.senderName,
    'bulk[0][send_phone]':      params.senderPhone,
    'bulk[0][send_addr1]':      params.senderAddress,
    'bulk[0][send_postcode]':   params.senderPostcode,
    'bulk[0][send_state]':      toStateCode(params.senderState),
    'bulk[0][send_country]':    'MY',
    'bulk[0][rec_name]':        params.recipientName,
    'bulk[0][rec_phone]':       params.recipientPhone,
    'bulk[0][rec_addr1]':       params.recipientAddress,
    'bulk[0][rec_postcode]':    params.recipientPostcode,
    'bulk[0][rec_state]':       toStateCode(params.recipientState),
    'bulk[0][rec_country]':     'MY',
    'bulk[0][collect_date]':    tomorrow,
  })

  const res = await fetch(`${getBaseUrl()}EPSubmitShipmentBulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const data = await res.json()
  if (data.api_status !== 'Success') throw new Error(data.error_remark || 'EasyParcel booking failed')
  return data.result?.[0]
}
