'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/contexts/CartProvider'

interface Props {
  product: {
    id: string
    name: string
    image_url: string | null
    price: number
    sale_price?: number | null
    stock_qty: number
    is_available: boolean
  }
  storeSlug:   string    // ← must be passed explicitly and match the current store
  storeId:     string
  variantId?:  string | null
  variantLabel?:string | null
  quantity?:   number
  className?:  string
}

export function AddToCartButton({
  product, storeSlug, storeId,
  variantId = null, variantLabel = null,
  quantity = 1, className,
}: Props) {
  const { addItem, items }  = useCart()
  const [flash, setFlash]   = useState(false)

  const inCart = items.some(
    (i) => i.product_id === product.id && i.variant_id === variantId
  )

  const unavailable = !product.is_available || product.stock_qty <= 0

  function handleAdd() {
    if (unavailable) return

    // The cart store will reject this if storeSlug doesn't match the provider
    addItem({
      product_id:    product.id,
      store_id:      storeId,
      store_slug:    storeSlug,   // ← carries store identity into the item
      product_name:  product.name,
      product_image: product.image_url,
      variant_id:    variantId,
      variant_label: variantLabel,
      unit_price:    product.sale_price ?? product.price,
      quantity,
      max_qty:       product.stock_qty,
    })

    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
  }

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={handleAdd}
      disabled={unavailable}
      className={`relative overflow-hidden font-bold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <AnimatePresence mode="wait">
        {flash ? (
          <motion.span
            key="added"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: -8 }}
            className="flex items-center gap-1.5"
          >
            ✅ Added!
          </motion.span>
        ) : unavailable ? (
          <motion.span key="unavail">Out of Stock</motion.span>
        ) : (
          <motion.span
            key="add"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: -8 }}
            className="flex items-center gap-1.5"
          >
            {inCart ? '🛒 Add More' : '🛒 Add to Cart'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
