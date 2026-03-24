import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Store } from '@repo/lib/mobile'

export function useNearbyStores(lat: number | null, lng: number | null, category?: string) {
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lat || !lng) return
    setLoading(true)

    supabase
      .rpc('get_nearby_stores', {
        user_lat: lat,
        user_lng: lng,
        radius_km: 30,
        category: category ?? null,
      })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setStores(data ?? [])
        setLoading(false)
      })
  }, [lat, lng, category])

  return { stores, loading, error }
}

export function useStore(storeId: string) {
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single()
      .then(({ data }) => {
        setStore(data)
        setLoading(false)
      })
  }, [storeId])

  return { store, loading }
}
