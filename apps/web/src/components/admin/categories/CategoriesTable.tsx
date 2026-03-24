'use client'
import { useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { DataTable } from '../ui/DataTable'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export function CategoriesTable({ categories }: { categories: any[] }) {
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const [loading, setLoading] = useState(false)

  async function deleteCategory(id: string) {
    if (!confirm('Are you sure you want to delete this category?')) return
    setLoading(true)
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Category deleted')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
          onClick={() => {/* TODO: Add modal */}}
        >
          <Plus size={16} /> Add Category
        </button>
      </div>
      <DataTable
        data={categories}
        columns={[
          { key: 'icon', label: 'Icon', render: (row) => <span className="text-xl">{row.icon}</span> },
          { key: 'name', label: 'Name', render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
          { key: 'slug', label: 'Slug', render: (row) => <span className="text-gray-500 font-mono text-xs">{row.slug}</span> },
          { key: 'sort_order', label: 'Order' },
          {
            key: 'is_active',
            label: 'Status',
            render: (row) => (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {row.is_active ? 'Active' : 'Inactive'}
              </span>
            )
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 size={14}/></button>
                <button
                  className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                  onClick={() => deleteCategory(row.id)}
                  disabled={loading}
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            )
          }
        ]}
      />
    </div>
  )
}
