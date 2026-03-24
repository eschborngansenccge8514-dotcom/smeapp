import { supabase } from '../supabase'

export async function getNearbyStores(lat: number, lng: number, category?: string) {
  const { data, error } = await supabase.rpc('get_nearby_stores', {
    p_user_lat: lat,
    p_user_lng: lng,
    p_radius_km: 30,
    p_category: category ?? undefined,
  })

  if (error) throw error
  return data
}
