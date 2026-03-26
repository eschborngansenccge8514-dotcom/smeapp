'use client'
import { useState }               from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link                        from 'next/link'
import Image                       from 'next/image'
import { useCart }                 from '@/contexts/CartProvider'

export function CartDrawer({ store }: { store: { id: string; name: string; slug: string; primary_color?: string | null } }) {
  const [open, setOpen]               = useState(false)
  const { items, itemCount, subtotal,
          removeItem, updateQty, clear } = useCart()

  const checkoutHref = `/stores/${store.slug}/checkout`

  return (
    <>
      {/* Trigger button (mounted in Navbar) */}
      <button
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Open cart"
        id="cart-trigger"
      >
        🛒
        <AnimatePresence>
          {itemCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{   scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-black flex items-center justify-center"
              style={{ backgroundColor: store.primary_color ?? '#6366f1' }}
            >
              {itemCount > 9 ? '9+' : itemCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{   opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{   x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-white z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900">Your Cart</h2>
                  {/* Store badge — makes it crystal clear whose cart this is */}
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <span>🏪</span>
                    {store.name}
                    {itemCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {itemCount > 0 && (
                    <button
                      onClick={clear}
                      className="text-xs font-bold text-red-400 hover:text-red-600 px-2.5 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 px-6">
                    <span className="text-5xl">🛒</span>
                    <p className="font-bold text-gray-900">Your cart is empty</p>
                    <p className="text-sm text-center">
                      Add items from <span className="font-bold text-gray-700">{store.name}</span> to get started
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <div key={`${item.product_id}-${item.variant_id}`} className="px-5 py-4 flex gap-4 hover:bg-gray-50 transition-colors group">
                        {/* Image */}
                        <div className="relative w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                          {item.product_image ? (
                            <Image
                              src={item.product_image}
                              alt={item.product_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-gray-900 text-sm truncate leading-tight">
                              {item.product_name}
                            </h3>
                            <button
                              onClick={() => removeItem(item.product_id, item.variant_id)}
                              className="text-gray-300 hover:text-red-400 transition-colors p-1 -mr-1"
                            >
                              <span className="text-xs font-bold">✕</span>
                            </button>
                          </div>

                          {item.variant_label && (
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">
                              {item.variant_label}
                            </p>
                          )}

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center p-0.5 rounded-xl bg-gray-50 border border-gray-100">
                              <button
                                onClick={() => updateQty(item.product_id, item.variant_id, item.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors font-black"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-xs font-black text-gray-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQty(item.product_id, item.variant_id, item.quantity + 1)}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors font-black"
                              >
                                +
                              </button>
                            </div>
                            <p className="font-black text-gray-900 text-sm">
                              RM {item.subtotal.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="p-5 border-t border-gray-100 space-y-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-500">Subtotal</span>
                    <span className="text-xl font-black text-gray-900">RM {subtotal.toFixed(2)}</span>
                  </div>
                  <Link
                    href={checkoutHref}
                    onClick={() => setOpen(false)}
                    className="block w-full py-4 rounded-2xl text-center text-white font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    style={{ backgroundColor: store.primary_color ?? '#6366f1' }}
                  >
                    Proceed to Checkout
                  </Link>
                  <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-black">
                    Secure checkout powered by SME App
                  </p>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
