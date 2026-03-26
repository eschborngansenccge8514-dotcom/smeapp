'use client'
import { useState } from 'react'
import { AddressFormModal } from '@/components/account/AddressFormModal'
import { deleteAddress, setDefaultAddress } from '@/lib/actions/addresses'
import { useRouter } from 'next/navigation'
import type { Address } from '@/types/customer'

export function AddressList({ initialAddresses }: { initialAddresses: Address[] }) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  function handleAdd() {
    setSelectedAddress(null)
    setModalOpen(true)
  }

  function handleEdit(address: Address) {
    setSelectedAddress(address)
    setModalOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this address?')) return
    setLoadingId(id)
    try {
      await deleteAddress(id)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  async function handleSetDefault(id: string) {
    setLoadingId(id)
    try {
      await setDefaultAddress(id)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleAdd}
        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-bold text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
      >
        <span className="text-xl">+</span> Add New Address
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialAddresses.map((addr) => (
          <div
            key={addr.id}
            className={`bg-white rounded-2xl border p-5 shadow-sm transition-all group ${
              addr.is_default ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-gray-100 hover:border-indigo-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-bold text-gray-500 rounded uppercase tracking-wider">
                  {addr.label || 'Home'}
                </span>
                {addr.is_default && (
                  <span className="px-2 py-0.5 bg-indigo-600 text-[10px] font-bold text-white rounded uppercase tracking-wider">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(addr)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(addr.id!)}
                  disabled={loadingId === addr.id}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-gray-900">{addr.full_name}</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                {addr.address_line_1}
                {addr.address_line_2 && <>, {addr.address_line_2}</>}
                <br />
                {addr.postcode} {addr.city}, {addr.state}
                <br />
                {addr.country}
              </p>
              <p className="text-xs font-medium text-gray-400 mt-2 flex items-center gap-1">
                📞 {addr.phone}
              </p>
            </div>

            {!addr.is_default && (
              <button
                onClick={() => handleSetDefault(addr.id!)}
                disabled={loadingId === addr.id}
                className="mt-4 w-full py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
              >
                Set as Default
              </button>
            )}
          </div>
        ))}
      </div>

      <AddressFormModal
        open={modalOpen}
        address={selectedAddress}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
