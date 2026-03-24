'use client'
import { useRouter } from 'next/navigation'

export function ProductSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()

  return (
    <input
      defaultValue={defaultValue}
      placeholder="Search products..."
      className="border border-gray-200 rounded-xl px-4 py-2 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          router.push(`/merchant/products?q=${(e.target as HTMLInputElement).value}`)
        }
      }}
    />
  )
}
