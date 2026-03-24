import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'

interface LocationStore {
  lat: number | null
  lng: number | null
  address: string | null
  loading: boolean
  requestLocation: () => Promise<void>
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      lat: null,
      lng: null,
      address: null,
      loading: false,

      requestLocation: async () => {
        set({ loading: true })
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') { set({ loading: false }); return }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        })
        const address = geo
          ? [geo.street, geo.city, geo.region].filter(Boolean).join(', ')
          : null

        set({ lat: loc.coords.latitude, lng: loc.coords.longitude, address, loading: false })
      },
    }),
    {
      name: 'location-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
