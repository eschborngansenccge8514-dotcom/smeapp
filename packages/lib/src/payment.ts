export function ringgitToSen(amount: number): number {
  // Curlec requires integers in sen — RM 10.50 = 1050
  return Math.round(amount * 100)
}

export function senToRinggit(sen: number): number {
  return sen / 100
}

export function formatOrderId(orderId: string): string {
  // Curlec receipt max 40 chars
  return `order_${orderId.replace(/-/g, '').slice(0, 33)}`
}
