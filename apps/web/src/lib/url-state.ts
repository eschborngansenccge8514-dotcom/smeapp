'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useUrlState() {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string | null, options?: { scroll?: boolean; replace?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      const query  = params.toString()
      const target = query ? `${pathname}?${query}` : pathname
      if (options?.replace) {
        router.replace(target, { scroll: options.scroll ?? false })
      } else {
        router.push(target, { scroll: options?.scroll ?? false })
      }
    },
    [router, pathname, searchParams]
  )

  const setParams = useCallback(
    (updates: Record<string, string | null>, options?: { scroll?: boolean; replace?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === '') params.delete(k)
        else params.set(k, v)
      })
      const query  = params.toString()
      const target = query ? `${pathname}?${query}` : pathname
      if (options?.replace) {
        router.replace(target, { scroll: options.scroll ?? false })
      } else {
        router.push(target, { scroll: options?.scroll ?? false })
      }
    },
    [router, pathname, searchParams]
  )

  const getParam = useCallback(
    (key: string, fallback = '') => searchParams.get(key) ?? fallback,
    [searchParams]
  )

  return { setParam, setParams, getParam, searchParams }
}
