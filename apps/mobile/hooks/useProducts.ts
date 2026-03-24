import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Product } from '@repo/lib/mobile'

export function useProducts(storeId: string) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_available', true)
      .order('category', { ascending: true })
      .then(({ data }) => {
        setProducts(data ?? [])
        setLoading(false)
      })
  }, [storeId])

  return { products, loading }
}

export function useProduct(productId: string) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('products')
      .select('*, stores(name, logo_url)')
      .eq('id', productId)
      .single()
      .then(({ data }) => {
        setProduct(data)
        setLoading(false)
      })
  }, [productId])

  return { product, loading }
}

export function useSearchProducts(query: string) {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    setLoading(true)

    const timer = setTimeout(() => {
      supabase
        .from('products')
        .select('*, stores(id, name)')
        .ilike('name', `%${query}%`)
        .eq('is_available', true)
        .limit(20)
        .then(({ data }) => {
          setResults(data ?? [])
          setLoading(false)
        })
    }, 300) // debounce

    return () => clearTimeout(timer)
  }, [query])

  return { results, loading }
}
