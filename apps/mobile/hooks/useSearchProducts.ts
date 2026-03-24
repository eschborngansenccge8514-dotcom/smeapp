import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Product } from '@repo/lib/types'

export function useSearchProducts(query: string) {
  const [results, setResults] = useState<(Product & { store_name: string })[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!query.trim()) {
      setResults([])
      return
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('products')
        .select('*, stores(name)')
        .ilike('name', `%${query}%`)
        .eq('is_available', true)
        .limit(30)

      setResults(
        (data ?? []).map((p: any) => ({ ...p, store_name: p.stores?.name ?? '' }))
      )
      setLoading(false)
    }, 300)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  return { results, loading }
}
