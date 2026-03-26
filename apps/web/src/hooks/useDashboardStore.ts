'use client'
import { create } from 'zustand'

interface DashboardState {
  store: any
  primaryColor: string
  setStore: (store: any) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  store: null,
  primaryColor: '#6366F1',
  setStore: (store) => set({ 
    store, 
    primaryColor: store?.primary_color || '#6366F1' 
  }),
}))
