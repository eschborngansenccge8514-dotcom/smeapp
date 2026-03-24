import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface NearbyStore {
  id: string
  name: string
  description: string | null
  category: string | null
  address: string | null
  lat: number | null
  lng: number | null
  logo_url: string | null
  brand_primary_color: string | null
  brand_subdomain: string | null
  distance_km: number
}

export function useNearbyStores(lat: number | null, lng: number | null, radiusKm = 10) {
  const [stores, setStores] = useState<NearbyStore[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStores = useCallback(async () => {
    if (!lat || !lng) return
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.rpc('get_nearby_stores', {
      user_lat: lat,
      user_lng: lng,
      radius_km: radiusKm,
      max_count: 20,
    })

    if (error) setError(error.message)
    else setStores(data ?? [])
    setLoading(false)
  }, [lat, lng, radiusKm])

  useEffect(() => { fetchStores() }, [fetchStores])

  return { stores, loading, error, refetch: fetchStores }
}
