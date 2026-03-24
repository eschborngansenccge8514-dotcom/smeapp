import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export function LowStockAlert({ products }: { products: any[] }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={18} className="text-amber-600" />
        <h3 className="font-bold text-amber-800">Low Stock Warning</h3>
      </div>
      <div className="flex gap-3 flex-wrap">
        {products.map((p) => (
          <Link key={p.id} href={`/merchant/products/${p.id}`}>
            <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2 hover:border-amber-400 transition-colors">
              {p.image_urls?.[0] && (
                <img src={p.image_urls[0]} className="w-7 h-7 rounded-lg object-cover" />
              )}
              <span className="text-sm font-medium text-gray-800">{p.name}</span>
              <span className={`text-xs font-bold ${p.stock_qty === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                {p.stock_qty === 0 ? 'OUT' : `${p.stock_qty} left`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
