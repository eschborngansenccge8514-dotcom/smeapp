'use client'
import { useTransition, useRef } from 'react'
import { useUrlState } from '@/lib/url-state'

interface Props {
  primaryColor: string
  placeholder?: string
}

export function StoreSearchBar({ primaryColor, placeholder = 'Search products…' }: Props) {
  const { setParams, getParam } = useUrlState()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const query = getParam('q')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    startTransition(() => {
      setParams({ q: val || null, page: null }, { replace: true, scroll: false })
    })
  }

  function handleClear() {
    setParams({ q: null, page: null }, { replace: true, scroll: false })
    inputRef.current?.focus()
  }

  return (
    <div className="relative w-full max-w-lg">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
        {isPending
          ? <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          : '🔍'}
      </span>
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
        aria-label="Search products in this store"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}
