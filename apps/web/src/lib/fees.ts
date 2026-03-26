import type { FeeConfig } from '@/types/customer'

// Default config — overridden by store settings
export const DEFAULT_FEE_CONFIG: FeeConfig = {
  service_fee_rate:      0.02,
  service_fee_cap:       10.00,
  service_fee_label:     'Service fee',
  free_delivery_threshold: 80.00,
  min_order_amount:      5.00,
}

// ─── Pure calculation helpers ─────────────────────────────────────────────────

export function calcServiceFee(subtotal: number, config: FeeConfig): number {
  const fee = subtotal * config.service_fee_rate
  if (config.service_fee_cap !== null) return Math.min(fee, config.service_fee_cap)
  return fee
}

export function calcDeliveryFee(
  subtotal: number,
  baseFee: number,
  config: FeeConfig
): number {
  if (config.free_delivery_threshold !== null && subtotal >= config.free_delivery_threshold) {
    return 0
  }
  return baseFee
}

export function calcOrderTotals(
  subtotal: number,
  deliveryBaseFee: number,
  discountAmount: number,
  config: FeeConfig
) {
  const delivery   = calcDeliveryFee(subtotal, deliveryBaseFee, config)
  const afterDisc  = Math.max(0, subtotal - discountAmount)
  const serviceFee = calcServiceFee(afterDisc, config)
  const total      = afterDisc + delivery + serviceFee

  return {
    subtotal,
    discount: discountAmount,
    delivery,
    service_fee: parseFloat(serviceFee.toFixed(2)),
    total:       parseFloat(total.toFixed(2)),
  }
}
