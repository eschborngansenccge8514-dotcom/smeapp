import { create } from 'zustand'

interface LocationStore {
  lat: number | null
  lng: number | null
  address: string | null
  setLocation: (lat: number, lng: number, address: string) => void
}

export const useLocationStore = create<LocationStore>((set) => ({
  lat: null,
  lng: null,
  address: null,
  setLocation: (lat, lng, address) => set({ lat, lng, address }),
}))
