'use client'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import type { CrmContact } from './types'

const SEGMENTS = [
  { value: 'all',      label: 'All Contacts',  icon: '👥', color: '#6B7280' },
  { value: 'vip',      label: 'VIP',           icon: '👑', color: '#F59E0B' },
  { value: 'loyal',    label: 'Loyal',         icon: '💚', color: '#10B981' },
  { value: 'new',      label: 'New',           icon: '🌟', color: '#3B82F6' },
  { value: 'at_risk',  label: 'At Risk',       icon: '⚠️', color: '#EF4444' },
  { value: 'inactive', label: 'Inactive',      icon: '😴', color: '#9CA3AF' },
]

interface Props {
  contacts: CrmContact[]
  loading: boolean
  primaryColor: string
  onSelectContact: (c: CrmContact) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onBulkEmail: (ids: string[]) => void
}

export function CrmContactTable({
  contacts, loading, primaryColor,
  onSelectContact, selectedIds, onToggleSelect, onBulkEmail,
}: Props) {
  const [segment, setSegment]     = useState('all')
  const [search, setSearch]       = useState('')
  const [sortBy, setSortBy]       = useState<'last_order_at' | 'total_spent' | 'total_orders'>('last_order_at')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc')
  const [page, setPage]           = useState(1)
  const PAGE_SIZE = 20

  const filtered = useMemo(() => {
    let result = [...contacts]
    if (segment !== 'all') result = result.filter((c) => c.segment === segment)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.tags?.some((t: string) => t.toLowerCase().includes(q))
      )
    }
    result.sort((a, b) => {
      const av = a[sortBy] ? new Date(a[sortBy] as string).getTime() : 0
      const bv = b[sortBy] ? new Date(b[sortBy] as string).getTime() : 0
      
      // Handle numeric sorting for other fields
      if (typeof a[sortBy] === 'number') {
        const nav = (a[sortBy] as number) ?? 0
        const nbv = (b[sortBy] as number) ?? 0
        return sortDir === 'desc' ? nbv - nav : nav - nbv
      }

      return sortDir === 'desc'
        ? (bv > av ? 1 : -1)
        : (av > bv ? 1 : -1)
    })
    return result
  }, [contacts, segment, search, sortBy, sortDir])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    <span className={`ml-1 text-xs ${sortBy === col ? 'text-white' : 'text-white/40'}`}>
      {sortBy === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  )

  return (
    <div className="space-y-4">
      {/* Segment tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {SEGMENTS.map((s) => {
          const count = s.value === 'all'
            ? contacts.length
            : contacts.filter((c) => c.segment === s.value).length
          const isActive = segment === s.value
          return (
            <button
              key={s.value}
              onClick={() => { setSegment(s.value); setPage(1) }}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                isActive ? 'text-white border-transparent shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={isActive ? { backgroundColor: primaryColor } : {}}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
              <span className={`rounded-full px-1.5 font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search + bulk actions */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search name, email, phone, tag…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:bg-white text-gray-900 placeholder-gray-400"
            style={{ '--tw-ring-color': primaryColor } as any}
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={() => onBulkEmail([...selectedIds])}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            ✉️ Email {selectedIds.size} Selected
          </button>
        )}
        <p className="text-xs text-gray-400 shrink-0">
          {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ backgroundColor: primaryColor }}>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    className="rounded accent-white"
                    checked={paginated.length > 0 && paginated.every((c) => selectedIds.has(c.id))}
                    onChange={() => {
                      const allSelected = paginated.every((c) => selectedIds.has(c.id))
                      paginated.forEach((c) => {
                        if (allSelected) {
                           if (selectedIds.has(c.id)) onToggleSelect(c.id)
                        } else {
                           if (!selectedIds.has(c.id)) onToggleSelect(c.id)
                        }
                      })
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">Segment</th>
                <th
                  className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wide cursor-pointer hover:text-white/80 select-none"
                  onClick={() => toggleSort('total_orders')}
                >
                  Orders <SortIcon col="total_orders" />
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wide cursor-pointer hover:text-white/80 select-none"
                  onClick={() => toggleSort('total_spent')}
                >
                  Total Spent <SortIcon col="total_spent" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide cursor-pointer hover:text-white/80 select-none"
                  onClick={() => toggleSort('last_order_at')}
                >
                  Last Order <SortIcon col="last_order_at" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">Tags</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="w-4 h-4 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-xl" />
                          <div className="space-y-1.5">
                            <div className="h-3 bg-gray-200 rounded w-28" />
                            <div className="h-2.5 bg-gray-100 rounded w-36" />
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-16" /></td>
                      ))}
                      <td />
                    </tr>
                  ))
                : paginated.map((c) => {
                    const segInfo = SEGMENTS.find((s) => s.value === c.segment)
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(c.id) ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => onToggleSelect(c.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded"
                            style={{ accentColor: primaryColor }}
                          />
                        </td>
                        <td
                          className="px-4 py-3 cursor-pointer"
                          onClick={() => onSelectContact(c)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 overflow-hidden"
                              style={{ backgroundColor: `${primaryColor}CC` }}
                            >
                              {c.avatar_url
                                ? <img src={c.avatar_url} alt={c.full_name} width={36} height={36} className="w-full h-full object-cover" />
                                : c.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">{c.full_name}</p>
                              <p className="text-xs text-gray-400 truncate">{c.email ?? c.phone ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {segInfo && segInfo.value !== 'all' ? (
                            <span
                              className="text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                              style={{ backgroundColor: `${segInfo.color}15`, color: segInfo.color }}
                            >
                              {segInfo.icon} {segInfo.label}
                            </span>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          {c.total_orders}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          RM {(c.total_spent ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {c.last_order_at
                            ? formatDistanceToNow(new Date(c.last_order_at), { addSuffix: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(c.tags ?? []).slice(0, 2).map((tag: string) => (
                              <span key={tag}
                                className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">
                                {tag}
                              </span>
                            ))}
                            {(c.tags?.length ?? 0) > 2 && (
                              <span className="text-xs text-gray-400">+{c.tags!.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onSelectContact(c)}
                            className="text-gray-400 hover:text-gray-700 transition-colors font-bold text-lg"
                          >
                            →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-gray-300 text-sm flex items-center justify-center font-bold"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      page === p ? 'text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                    style={page === p ? { backgroundColor: primaryColor } : {}}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-gray-300 text-sm flex items-center justify-center font-bold"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
