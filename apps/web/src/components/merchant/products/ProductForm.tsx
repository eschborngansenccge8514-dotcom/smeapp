'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/merchant/ui/ImageUpload'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProductFormProps {
  storeId: string
  storeCategory?: string | null
  categories: any[]
  product?: any  // if editing
}

export function ProductForm({ storeId, storeCategory, categories, product }: ProductFormProps) {
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
    category: product?.category ?? '',
    is_available: product?.is_available ?? true,
    is_popular: product?.is_popular ?? false,
    is_new: product?.is_new ?? false,
    spice_level: product?.spice_level ?? 0,
    is_halal: product?.is_halal ?? false,
    is_vegan: product?.is_vegan ?? false,
    is_vegetarian: product?.is_vegetarian ?? false,
    // Grocery terms
    subcategory: product?.subcategory ?? '',
    brand: product?.brand ?? '',
    weight_value: product?.weight_value?.toString() ?? '',
    weight_unit: product?.weight_unit ?? 'g',
    is_organic: product?.is_organic ?? false,
    is_local: product?.is_local ?? false,
    is_on_promotion: product?.is_on_promotion ?? false,
    promotion_label: product?.promotion_label ?? '',
    promotion_price: product?.promotion_price?.toString() ?? '',
    min_order_qty: product?.min_order_qty?.toString() ?? '1',
    max_order_qty: product?.max_order_qty?.toString() ?? '',
    country_of_origin: product?.country_of_origin ?? '',
    expiry_note: product?.expiry_note ?? '',
    low_stock_threshold: product?.low_stock_threshold?.toString() ?? '5',
    // Pharmacy terms
    generic_name: product?.generic_name ?? '',
    rx_status: product?.rx_status ?? 'otc',
    dosage_form: product?.dosage_form ?? '',
    dosage_strength: product?.dosage_strength ?? '',
    pack_size: product?.pack_size ?? '',
    active_ingredient: product?.active_ingredient ?? '',
    indications: product?.indications?.join(', ') ?? '',
    warnings: product?.warnings?.join(', ') ?? '',
    age_restriction: product?.age_restriction ?? '',
    requires_consultation: product?.requires_consultation ?? false,
    registration_no: product?.registration_no ?? '',
    // Fashion terms
    material: product?.material ?? '',
    fit_type: product?.fit_type ?? '',
    is_new_arrival: product?.is_new_arrival ?? false,
    is_bestseller: product?.is_bestseller ?? false,
    is_on_sale: product?.is_on_sale ?? false,
    sale_price: product?.sale_price?.toString() ?? '',
    collection: product?.collection ?? '',
    gender_target: product?.gender_target ?? 'unisex',
    tags: product?.tags?.join(', ') ?? '',
    model_height: product?.model_height ?? '',
    care_instructions: product?.care_instructions?.join('\n') ?? '',
    sizes: product?.sizes ?? [],
    colours: product?.colours ?? [],
    gallery_urls: product?.gallery_urls ?? [],
    // Electronics terms
    model_number: product?.model_number ?? '',
    warranty_months: product?.warranty_months?.toString() ?? '',
    is_official_warranty: product?.is_official_warranty ?? false,
    is_refurbished: product?.is_refurbished ?? false,
    refurbished_grade: product?.refurbished_grade ?? '',
    in_box_items: product?.in_box_items?.join(', ') ?? '',
    quick_specs: product?.quick_specs?.join(', ') ?? '',
    electronics_specs: product?.specs ?? [],
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
        category: form.category || null,
        is_available: form.is_available,
        is_popular: form.is_popular,
        is_new: form.is_new,
        spice_level: form.spice_level,
        is_halal: form.is_halal,
        is_vegan: form.is_vegan,
        is_vegetarian: form.is_vegetarian,
        image_urls: imageUrls,
        // Grocery
        subcategory: form.subcategory.trim() || null,
        brand: form.brand.trim() || null,
        weight_value: form.weight_value ? parseFloat(form.weight_value) : null,
        weight_unit: form.weight_unit || null,
        is_organic: form.is_organic,
        is_local: form.is_local,
        is_on_promotion: form.is_on_promotion,
        promotion_label: form.promotion_label.trim() || null,
        promotion_price: form.promotion_price ? parseFloat(form.promotion_price) : null,
        min_order_qty: form.min_order_qty ? parseInt(form.min_order_qty) : null,
        max_order_qty: form.max_order_qty ? parseInt(form.max_order_qty) : null,
        country_of_origin: form.country_of_origin.trim() || null,
        expiry_note: form.expiry_note.trim() || null,
        low_stock_threshold: form.low_stock_threshold ? parseInt(form.low_stock_threshold) : 5,
        // Pharmacy
        generic_name: form.generic_name.trim() || null,
        rx_status: form.rx_status,
        dosage_form: form.dosage_form.trim() || null,
        dosage_strength: form.dosage_strength.trim() || null,
        pack_size: form.pack_size.trim() || null,
        active_ingredient: form.active_ingredient.trim() || null,
        indications: form.indications ? form.indications.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
        warnings: form.warnings ? form.warnings.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
        age_restriction: form.age_restriction.trim() || null,
        requires_consultation: form.requires_consultation,
        registration_no: form.registration_no.trim() || null,
        // Fashion
        material: form.material.trim() || null,
        fit_type: form.fit_type.trim() || null,
        is_new_arrival: form.is_new_arrival,
        is_bestseller: form.is_bestseller,
        is_on_sale: form.is_on_sale,
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        collection: form.collection.trim() || null,
        gender_target: form.gender_target,
        tags: form.tags ? form.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        model_height: form.model_height.trim() || null,
        care_instructions: form.care_instructions ? form.care_instructions.split('\n').map((s: string) => s.trim()).filter(Boolean) : [],
        sizes: form.sizes,
        colours: form.colours,
        gallery_urls: imageUrls.length > 1 ? imageUrls.slice(1) : [],
        // Electronics
        model_number: form.model_number.trim() || null,
        warranty_months: form.warranty_months ? parseInt(form.warranty_months) : null,
        is_official_warranty: form.is_official_warranty,
        is_refurbished: form.is_refurbished,
        refurbished_grade: form.refurbished_grade || null,
        in_box_items: form.in_box_items ? form.in_box_items.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        quick_specs: form.quick_specs ? form.quick_specs.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        specs: form.electronics_specs,
        variants: form.colours.flatMap((c: any) => 
          form.sizes.map((s: string) => ({
            id: `${c.name}-${s}`.toLowerCase(),
            size: s,
            colour: c.name,
            stock_qty: parseInt(form.stock_qty), // Defaulting to main stock, ideally should be per variant
          }))
        )
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
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="e.g. Nasi Lemak Ayam" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)}
            rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Describe your product..." />
        </div>
      </div>

      {/* Price & Stock */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Price (RM) *</label>
          <input type="number" min="0" step="0.01" value={form.price}
            onChange={(e) => update('price', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="0.00" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Stock Quantity *</label>
          <input type="number" min="0" value={form.stock_qty}
            onChange={(e) => update('stock_qty', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="0" />
        </div>
      </div>

      {/* Category, SKU, Weight */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
          <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">SKU</label>
          <input value={form.sku} onChange={(e) => update('sku', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="SKU-001" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Weight (kg)</label>
          <input type="number" min="0" step="0.001" value={form.weight_kg}
            onChange={(e) => update('weight_kg', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="0.500" />
        </div>
      </div>

      {/* Grocery specific fields */}
      {(storeCategory?.includes('Grocery') || storeCategory?.includes('Market')) && (
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
            🛒 Grocery & Market Details
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input value={form.brand} onChange={(e) => update('brand', e.target.value)}
                placeholder="e.g. Nestlé, Farm Fresh" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub-category</label>
              <input value={form.subcategory} onChange={(e) => update('subcategory', e.target.value)}
                placeholder="e.g. Milk, Vegetables" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight / Volume</label>
              <div className="flex gap-2">
                <input type="number" step="0.01" value={form.weight_value} onChange={(e) => update('weight_value', e.target.value)}
                  placeholder="500" className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <select value={form.weight_unit} onChange={(e) => update('weight_unit', e.target.value)}
                  className="w-24 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {['g','kg','ml','L','pcs','pack'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origin Country</label>
              <input value={form.country_of_origin} onChange={(e) => update('country_of_origin', e.target.value)}
                placeholder="e.g. Malaysia, Australia" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => update('is_on_promotion', !form.is_on_promotion)}
                className={`w-10 h-5 rounded-full relative transition-colors ${form.is_on_promotion ? 'bg-orange-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${form.is_on_promotion ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-sm font-bold text-orange-700">On Promotion?</span>
            </div>

            {form.is_on_promotion && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-orange-700 mb-1 uppercase">Promo Price (RM)</label>
                  <input type="number" step="0.01" value={form.promotion_price} onChange={(e) => update('promotion_price', e.target.value)}
                    className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-orange-700 mb-1 uppercase">Promo Label</label>
                  <input value={form.promotion_label} onChange={(e) => update('promotion_label', e.target.value)}
                    placeholder="e.g. 20% OFF, Buy 2 Free 1" className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min. Order Qty</label>
              <input type="number" min="1" value={form.min_order_qty} onChange={(e) => update('min_order_qty', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert at</label>
              <input type="number" min="0" value={form.low_stock_threshold} onChange={(e) => update('low_stock_threshold', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: 'is_organic', label: '🌿 Organic', active: form.is_organic },
              { key: 'is_local',   label: '🇲🇾 Local',   active: form.is_local },
              { key: 'is_popular', label: '🔥 Popular', active: form.is_popular },
              { key: 'is_new',     label: '✨ New',     active: form.is_new },
            ].map((tag) => (
              <button key={tag.key} type="button" onClick={() => update(tag.key, !tag.active)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  tag.active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pharmacy specific fields */}
      {(storeCategory?.includes('Health') || storeCategory?.includes('Pharmacy')) && (
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
            💊 Pharmacy & Health Details
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name</label>
              <input value={form.generic_name} onChange={(e) => update('generic_name', e.target.value)}
                placeholder="e.g. Paracetamol" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input value={form.brand} onChange={(e) => update('brand', e.target.value)}
                placeholder="e.g. Panadol" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Category</label>
              <select value={form.category} onChange={(e) => update('category', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">None</option>
                <option value="Pain Relief">Pain Relief</option>
                <option value="Cold & Flu">Cold & Flu</option>
                <option value="Vitamins & Supplements">Vitamins & Supplements</option>
                <option value="Digestive Health">Digestive Health</option>
                <option value="Wound Care">Wound Care</option>
                <option value="Eye & Ear">Eye & Ear</option>
                <option value="Skin Care">Skin Care</option>
                <option value="Baby & Mother">Baby & Mother</option>
                <option value="Diabetes Care">Diabetes Care</option>
                <option value="Prescription (Rx)">Prescription (Rx)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rx Status</label>
              <select value={form.rx_status} onChange={(e) => update('rx_status', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="otc">Over-the-Counter</option>
                <option value="pharmacist_only">Pharmacist Only</option>
                <option value="prescription">Prescription Required</option>
                <option value="supplement">Supplement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage Form</label>
              <select value={form.dosage_form} onChange={(e) => update('dosage_form', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">None</option>
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Cream">Cream</option>
                <option value="Gel">Gel</option>
                <option value="Ointment">Ointment</option>
                <option value="Drops">Drops</option>
                <option value="Spray">Spray</option>
                <option value="Patch">Patch</option>
                <option value="Injection">Injection</option>
                <option value="Inhaler">Inhaler</option>
                <option value="Powder">Powder</option>
                <option value="Sachet">Sachet</option>
                <option value="Lozenge">Lozenge</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage Strength</label>
              <input value={form.dosage_strength} onChange={(e) => update('dosage_strength', e.target.value)}
                placeholder="e.g. 500mg, 10mg/5ml" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Active Ingredient</label>
              <input value={form.active_ingredient} onChange={(e) => update('active_ingredient', e.target.value)}
                placeholder="e.g. Paracetamol 500mg" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pack Size</label>
              <input value={form.pack_size} onChange={(e) => update('pack_size', e.target.value)}
                placeholder="e.g. 10 tablets, 100ml" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Indications (comma separated)</label>
             <input value={form.indications} onChange={(e) => update('indications', e.target.value)}
                placeholder="e.g. Fever, Headache, Joint Pain" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Warnings (comma separated)</label>
             <input value={form.warnings} onChange={(e) => update('warnings', e.target.value)}
                placeholder="e.g. May cause drowsiness, Do not exceed 8 tablets in 24 hours" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age Restriction</label>
              <input value={form.age_restriction} onChange={(e) => update('age_restriction', e.target.value)}
                placeholder="e.g. Not for children under 12" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration No. (KKM/MAL)</label>
              <input value={form.registration_no} onChange={(e) => update('registration_no', e.target.value)}
                placeholder="e.g. MAL12345678X" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origin Country</label>
              <input value={form.country_of_origin} onChange={(e) => update('country_of_origin', e.target.value)}
                placeholder="e.g. Malaysia, Australia" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Order Qty</label>
              <input type="number" min="1" value={form.max_order_qty} onChange={(e) => update('max_order_qty', e.target.value)}
                placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => update('requires_consultation', !form.requires_consultation)}
              className={`w-10 h-5 rounded-full relative transition-colors ${form.requires_consultation ? 'bg-indigo-600' : 'bg-gray-200'}`}>
              <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${form.requires_consultation ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm font-bold text-gray-700">Pharmacist Consultation Recommended</span>
          </div>
          
          <div className="bg-orange-50 rounded-xl p-4 space-y-3">
             <div className="flex items-center gap-3">
               <button type="button" onClick={() => update('is_on_promotion', !form.is_on_promotion)}
                 className={`w-10 h-5 rounded-full relative transition-colors ${form.is_on_promotion ? 'bg-orange-500' : 'bg-gray-200'}`}>
                 <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${form.is_on_promotion ? 'translate-x-5' : ''}`} />
               </button>
               <span className="text-sm font-bold text-orange-700">On Promotion?</span>
             </div>

             {form.is_on_promotion && (
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-orange-700 mb-1 uppercase">Promo Price (RM)</label>
                   <input type="number" step="0.01" value={form.promotion_price} onChange={(e) => update('promotion_price', e.target.value)}
                     className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-orange-700 mb-1 uppercase">Promo Label</label>
                   <input value={form.promotion_label} onChange={(e) => update('promotion_label', e.target.value)}
                     placeholder="e.g. 20% OFF, Special Price" className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                 </div>
               </div>
             )}
           </div>

        </div>
      )}
      {/* Fashion specific fields — shown only for Fashion stores */}
      {(storeCategory?.includes('Fashion') || storeCategory?.includes('Apparel')) && (
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
            👗 Fashion & Apparel Details
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
              <input value={form.collection} onChange={(e) => update('collection', e.target.value)}
                placeholder="e.g. Summer 2024" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={form.gender_target} onChange={(e) => update('gender_target', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="unisex">Unisex</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="kids">Kids</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <input value={form.material} onChange={(e) => update('material', e.target.value)}
                placeholder="e.g. 100% Cotton" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fit Type</label>
              <input value={form.fit_type} onChange={(e) => update('fit_type', e.target.value)}
                placeholder="e.g. Slim Fit, Oversized" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Height / Info</label>
              <input value={form.model_height} onChange={(e) => update('model_height', e.target.value)}
                placeholder="e.g. 175cm wearing size M" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
              <input value={form.tags} onChange={(e) => update('tags', e.target.value)}
                placeholder="e.g. vintage, summer, eco-friendly" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Care Instructions (one per line)</label>
            <textarea value={form.care_instructions} onChange={(e) => update('care_instructions', e.target.value)}
              rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Hand wash cold&#10;Do not iron" />
          </div>

          <div className="bg-pink-50 rounded-xl p-4 space-y-3">
             <div className="flex items-center gap-3">
               <button type="button" onClick={() => update('is_on_sale', !form.is_on_sale)}
                 className={`w-10 h-5 rounded-full relative transition-colors ${form.is_on_sale ? 'bg-pink-500' : 'bg-gray-200'}`}>
                 <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${form.is_on_sale ? 'translate-x-5' : ''}`} />
               </button>
               <span className="text-sm font-bold text-pink-700">On Sale?</span>
             </div>
             {form.is_on_sale && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-pink-700 mb-1 uppercase">Sale Price (RM)</label>
                    <input type="number" step="0.01" value={form.sale_price} onChange={(e) => update('sale_price', e.target.value)}
                      className="w-full border border-pink-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
             )}
          </div>

          <div className="space-y-4">
             <div>
               <label className="text-sm font-medium text-gray-700 block mb-2">Available Sizes</label>
               <div className="flex flex-wrap gap-2">
                 {['XS','S','M','L','XL','XXL','Free Size'].map(s => {
                   const active = form.sizes.includes(s)
                   return (
                     <button key={s} type="button" onClick={() => {
                        const newSizes = active ? form.sizes.filter((sz: string) => sz !== s) : [...form.sizes, s]
                        update('sizes', newSizes)
                     }} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                       active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200'
                     }`}>{s}</button>
                   )
                 })}
               </div>
             </div>

             <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Colours</label>
                <div className="flex flex-wrap gap-3">
                   {form.colours.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                        <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: c.hex }} />
                        <span className="text-xs font-medium">{c.name}</span>
                        <button onClick={() => {
                           const newColours = form.colours.filter((_: any, idx: number) => idx !== i)
                           update('colours', newColours)
                        }} className="text-red-400 hover:text-red-500 ml-1">✕</button>
                      </div>
                   ))}
                   <button type="button" onClick={() => {
                      const name = prompt('Colour Name (e.g. Navy Blue)')
                      const hex = prompt('Hex Code (e.g. #000080)')
                      if (name && hex) update('colours', [...form.colours, { name, hex }])
                   }} className="px-3 py-2 rounded-xl text-xs font-bold border border-dashed border-gray-300 text-gray-400 hover:border-indigo-300 hover:text-indigo-500">+ Add Colour</button>
                </div>
             </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {[
              { key: 'is_new_arrival', label: '✨ New Arrival', active: form.is_new_arrival },
              { key: 'is_bestseller',  label: '🏆 Bestseller',  active: form.is_bestseller },
              { key: 'is_popular',      label: '🔥 Popular',     active: form.is_popular },
            ].map((tag) => (
              <button key={tag.key} type="button" onClick={() => update(tag.key, !tag.active)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  tag.active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Electronics specific fields */}
      {(storeCategory?.includes('Electronics') || storeCategory?.includes('Gadgets') || storeCategory?.includes('Computer')) && (
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
            💻 Electronics & Gadgets Details
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input value={form.brand} onChange={(e) => update('brand', e.target.value)}
                placeholder="e.g. Apple, Samsung" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Number</label>
              <input value={form.model_number} onChange={(e) => update('model_number', e.target.value)}
                placeholder="e.g. SM-S928B" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warranty (Months)</label>
              <input type="number" min="0" value={form.warranty_months} onChange={(e) => update('warranty_months', e.target.value)}
                placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <button type="button" onClick={() => update('is_official_warranty', !form.is_official_warranty)}
                className={`w-10 h-5 rounded-full relative transition-colors ${form.is_official_warranty ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${form.is_official_warranty ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-sm font-medium text-gray-700">Official Warranty</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quick Specs (comma separated)</label>
              <input value={form.quick_specs} onChange={(e) => update('quick_specs', e.target.value)}
                placeholder={`e.g. 6.7" OLED, 5000mAh, 50MP Camera`} className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">In Box Items (comma separated)</label>
              <input value={form.in_box_items} onChange={(e) => update('in_box_items', e.target.value)}
                placeholder="e.g. Phone, USB-C Cable, Manual" className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4 space-y-3">
             <div className="flex items-center gap-3">
               <button type="button" onClick={() => update('is_refurbished', !form.is_refurbished)}
                 className={`w-10 h-5 rounded-full relative transition-colors ${form.is_refurbished ? 'bg-yellow-500' : 'bg-gray-200'}`}>
                 <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${form.is_refurbished ? 'translate-x-5' : ''}`} />
               </button>
               <span className="text-sm font-bold text-yellow-800">Refurbished / Used?</span>
             </div>
             {form.is_refurbished && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-yellow-800 mb-1 uppercase">Condition Grade</label>
                    <select value={form.refurbished_grade} onChange={(e) => update('refurbished_grade', e.target.value)}
                      className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                      <option value="">None</option>
                      <option value="A">Grade A — Like New</option>
                      <option value="B">Grade B — Good</option>
                      <option value="C">Grade C — Fair</option>
                    </select>
                  </div>
                </div>
             )}
          </div>

          <div className="bg-orange-50 rounded-xl p-4 space-y-3">
             <div className="flex items-center gap-3">
               <button type="button" onClick={() => update('is_on_promotion', !form.is_on_promotion)}
                 className={`w-10 h-5 rounded-full relative transition-colors ${form.is_on_promotion ? 'bg-orange-500' : 'bg-gray-200'}`}>
                 <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${form.is_on_promotion ? 'translate-x-5' : ''}`} />
               </button>
               <span className="text-sm font-bold text-orange-700">On Promotion?</span>
             </div>
             {form.is_on_promotion && (
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-orange-700 mb-1 uppercase">Promo Price (RM)</label>
                   <input type="number" step="0.01" value={form.promotion_price} onChange={(e) => update('promotion_price', e.target.value)}
                     className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-orange-700 mb-1 uppercase">Promo Label</label>
                   <input value={form.promotion_label} onChange={(e) => update('promotion_label', e.target.value)}
                     placeholder="e.g. 20% OFF, Year End Sale" className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                 </div>
               </div>
             )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {[
              { key: 'is_new_arrival', label: '✨ New Arrival', active: form.is_new_arrival },
              { key: 'is_bestseller',  label: '🏆 Bestseller',  active: form.is_bestseller },
              { key: 'is_popular',     label: '🔥 Popular',     active: form.is_popular },
            ].map((tag) => (
              <button key={tag.key} type="button" onClick={() => update(tag.key, !tag.active)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  tag.active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {tag.label}
              </button>
            ))}
          </div>

          <div>
             <label className="text-sm font-medium text-gray-700 block mb-2">Detailed Specifications</label>
             <div className="space-y-2">
                 {form.electronics_specs.map((spec: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input value={spec.group} onChange={(e) => {
                         const s = [...form.electronics_specs]
                         s[i].group = e.target.value
                         update('electronics_specs', s)
                      }} placeholder="Group (e.g. Display)" className="w-1/4 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                       <input value={spec.key} onChange={(e) => {
                         const s = [...form.electronics_specs]
                         s[i].key = e.target.value
                         update('electronics_specs', s)
                      }} placeholder="Spec Key" className="w-1/4 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                      <input value={spec.value} onChange={(e) => {
                         const s = [...form.electronics_specs]
                         s[i].value = e.target.value
                         update('electronics_specs', s)
                      }} placeholder="Value" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                      <button onClick={() => {
                           const s = form.electronics_specs.filter((_: any, idx: number) => idx !== i)
                           update('electronics_specs', s)
                        }} className="p-2 text-red-400 hover:text-red-600">
                        <X size={16} />
                      </button>
                    </div>
                 ))}
                 <button type="button" onClick={() => {
                    update('electronics_specs', [...form.electronics_specs, { group: '', key: '', value: '' }])
                 }} className="px-3 py-2 rounded-xl text-xs font-bold border border-dashed border-gray-300 text-gray-400 hover:border-indigo-300 hover:text-indigo-500">+ Add Spec Item</button>
             </div>
          </div>
        </div>
      )}

      {/* F&B specific fields — shown only for F&B stores */}
      {storeCategory?.includes('Food') && (
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
            🍜 Food & Beverages Details
          </p>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Menu Category</label>
            <input type="text" value={form.category} onChange={(e) => update('category', e.target.value)}
              placeholder="e.g. Main Course, Drinks, Desserts"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          {/* Spice Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Spice Level</label>
            <div className="flex gap-2">
              {[{v:0,l:'None'},{v:1,l:'🌶️ Mild'},{v:2,l:'🌶️🌶️ Medium'},{v:3,l:'🌶️🌶️🌶️ Hot'}].map((s) => (
                <button key={s.v} type="button" onClick={() => update('spice_level', s.v)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    form.spice_level === s.v ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary flags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Tags</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'is_halal',      label: '✓ Halal',      active: form.is_halal },
                { key: 'is_vegan',      label: '🌱 Vegan',      active: form.is_vegan },
                { key: 'is_vegetarian', label: '🥗 Vegetarian', active: form.is_vegetarian },
                { key: 'is_popular',    label: '🔥 Popular',    active: form.is_popular },
                { key: 'is_new',        label: '✨ New',         active: form.is_new },
              ].map((tag) => (
                <button key={tag.key} type="button" onClick={() => update(tag.key, !tag.active)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    tag.active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
