'use client'
import { useEffect } from 'react'
import { useDashboardStore } from '@/hooks/useDashboardStore'

export function StoreHydrator({ store }: { store: any }) {
  const setStore = useDashboardStore((s) => s.setStore)
  
  useEffect(() => {
    if (store) {
      setStore(store)
    }
  }, [store, setStore])

  return null
}
