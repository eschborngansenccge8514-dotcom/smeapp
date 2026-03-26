import { localCart, loadCartFromDB, persistCartToDB } from './cart-storage'
import type { CartLineItem } from './cart-types'

/**
 * Called once after a user signs in.
 * Merges their guest localStorage cart with their saved DB cart
 * for the CURRENT store only.
 */
export async function mergeGuestCartOnLogin(
  storeSlug: string,
  storeId:   string
): Promise<CartLineItem[]> {
  const [guestItems, dbItems] = await Promise.all([
    Promise.resolve(localCart.read(storeSlug)),
    loadCartFromDB(storeId),
  ])

  if (guestItems.length === 0) return dbItems
  if (dbItems.length === 0) {
    // Just persist the guest cart to DB
    await persistCartToDB(storeId, guestItems)
    localCart.clear(storeSlug)
    return guestItems
  }

  // Merge strategy: guest items take priority for quantity,
  // DB items retained if not in guest cart
  const merged = [...dbItems]

  for (const guestItem of guestItems) {
    const existingIdx = merged.findIndex(
      (i) =>
        i.product_id === guestItem.product_id &&
        i.variant_id === guestItem.variant_id
    )

    if (existingIdx >= 0) {
      // Use the higher quantity, capped at max_qty
      const combined = Math.min(
        merged[existingIdx].quantity + guestItem.quantity,
        guestItem.max_qty
      )
      merged[existingIdx] = {
        ...merged[existingIdx],
        quantity: combined,
        subtotal: combined * merged[existingIdx].unit_price,
      }
    } else {
      merged.push(guestItem)
    }
  }

  await persistCartToDB(storeId, merged)
  localCart.clear(storeSlug)
  return merged
}
