'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/merchant/ui/ImageUpload'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProductFormProps {
  storeId: string
  categories: any[]
  product?: any  // if editing
}

export function ProductForm({ storeId, categories, product }: ProductFormProps) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const isEditing = !!product

  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price?.toString() ?? '',
    stock_qty: product?.stock_qty?.toString() ?? '',
    sku: product?.sku ?? '',
    weight_kg: product?.weight_kg?.toString() ?? '',
    category_id: product?.category_id ?? '',
    is_available: product?.is_available ?? true,
  })
  const [imageUrls, setImageUrls] = useState<string[]>(product?.image_urls ?? [])
  const [variants, setVariants] = useState<{ name: string; price: string; stock: string }[]>(
    product?.product_variants?.map((v: any) => ({
      name: v.name, price: v.price?.toString() ?? '', stock: v.stock_qty.toString()
    })) ?? []
  )
  const [loading, setLoading] = useState(false)

  function update(key: string, value: any) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function addImageUrl(url: string) {
    setImageUrls((prev) => [...prev, url])
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  function addVariant() {
    setVariants((v) => [...v, { name: '', price: '', stock: '' }])
  }

  function updateVariant(index: number, key: string, value: string) {
    setVariants((v) => v.map((vt, i) => i === index ? { ...vt, [key]: value } : vt))
  }

  function removeVariant(index: number) {
    setVariants((v) => v.filter((_, i) => i !== index))
  }

  async function save() {
    if (!form.name.trim() || !form.price || !form.stock_qty) {
      toast.error('Name, price and stock are required')
      return
    }
    if (isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) {
      toast.error('Enter a valid price')
      return
    }
    setLoading(true)
    try {
      const productData = {
        store_id: storeId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        stock_qty: parseInt(form.stock_qty),
        sku: form.sku.trim() || null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        category_id: form.category_id || null,
        is_available: form.is_available,
        image_urls: imageUrls,
      }

      let productId = product?.id
      if (isEditing) {
        const { error } = await supabase.from('products').update(productData).eq('id', productId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('products').insert(productData).select().single()
        if (error) throw error
        productId = data.id
      }

      // Save variants
      if (productId) {
        await supabase.from('product_variants').delete().eq('product_id', productId)
        const validVariants = variants.filter((v) => v.name.trim())
        if (validVariants.length > 0) {
          await supabase.from('product_variants').insert(
            validVariants.map((v, i) => ({
              product_id: productId,
              name: v.name.trim(),
              price: v.price ? parseFloat(v.price) : null,
              stock_qty: v.stock ? parseInt(v.stock) : 0,
              sort_order: i,
            }))
          )
        }
      }

      toast.success(isEditing ? 'Product updated' : 'Product created')
      router.push('/merchant/products')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
      {/* Images */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Product Images (first image is the main)
        </label>
        <div className="flex gap-3 flex-wrap">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
              {i === 0 && (
                <span className="absolute -top-1 -left-1 bg-indigo-500 text-white text-xs px-1 rounded">Main</span>
              )}
              <button onClick={() => removeImage(i)}
                className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center">
                <X size={10} />
              </button>
            </div>
          ))}
          {imageUrls.length < 5 && (
            <ImageUpload
              bucket="product-images"
              onUpload={addImageUrl}
            />
          )}
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Product Name *</label>
          <input value={form.name} onChange={(e) => update('name', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="e.g. Nasi Lemak Ayam" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)}
            rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Describe your product..." />
        </div>
      </div>

      {/* Price & Stock */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Price (RM) *</label>
          <input type="number" min="0" step="0.01" value={form.price}
            onChange={(e) => update('price', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="0.00" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Stock Quantity *</label>
          <input type="number" min="0" value={form.stock_qty}
            onChange={(e) => update('stock_qty', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="0" />
        </div>
      </div>

      {/* Category, SKU, Weight */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
          <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">SKU</label>
          <input value={form.sku} onChange={(e) => update('sku', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="SKU-001" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Weight (kg)</label>
          <input type="number" min="0" step="0.001" value={form.weight_kg}
            onChange={(e) => update('weight_kg', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="0.500" />
        </div>
      </div>

      {/* Variants */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Variants (optional)</label>
          <button onClick={addVariant}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
            <Plus size={13} /> Add Variant
          </button>
        </div>
        {variants.map((v, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)}
              placeholder="e.g. Large" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input type="number" value={v.price} onChange={(e) => updateVariant(i, 'price', e.target.value)}
              placeholder="Price" className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input type="number" value={v.stock} onChange={(e) => updateVariant(i, 'stock', e.target.value)}
              placeholder="Stock" className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <button onClick={() => removeVariant(i)} className="p-2 text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Availability Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => update('is_available', !form.is_available)}
          className={`relative inline-flex h-6 w-11 rounded-full transition-colors
            ${form.is_available ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5
            ${form.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
        <span className="text-sm text-gray-600">
          {form.is_available ? 'Visible to customers' : 'Hidden from customers'}
        </span>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={save} disabled={loading}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
        </button>
        <button onClick={() => router.back()}
          className="px-5 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">
          Cancel
        </button>
      </div>
    </div>
  )
}
