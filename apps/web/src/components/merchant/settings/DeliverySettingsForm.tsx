'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  Zap, Package, Store, MapPin, Truck,
  ToggleLeft, ToggleRight, Info
} from 'lucide-react'

interface DeliveryConfig {
  lat: number | null
  lng: number | null
  postcode: string
  state: string
  delivery_enabled_lalamove: boolean
  delivery_enabled_easyparcel: boolean
  delivery_enabled_self_pickup: boolean
  delivery_free_threshold: number | null
  delivery_max_radius_km: number | null
  delivery_note: string
}

interface DeliverySettingsFormProps {
  storeId: string
  config: DeliveryConfig
}

const MY_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan',
  'Melaka', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak',
  'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
]

export function DeliverySettingsForm({ storeId, config }: DeliverySettingsFormProps) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()

  const [form, setForm] = useState({
    lat: config.lat?.toString() ?? '',
    lng: config.lng?.toString() ?? '',
    postcode: config.postcode ?? '',
    state: config.state ?? '',
    delivery_enabled_lalamove: config.delivery_enabled_lalamove ?? true,
    delivery_enabled_easyparcel: config.delivery_enabled_easyparcel ?? true,
    delivery_enabled_self_pickup: config.delivery_enabled_self_pickup ?? true,
    delivery_free_threshold: config.delivery_free_threshold?.toString() ?? '',
    delivery_max_radius_km: config.delivery_max_radius_km?.toString() ?? '',
    delivery_note: config.delivery_note ?? '',
  })

  const [geocoding, setGeocoding] = useState(false)
  const [saving, setSaving] = useState(false)

  function toggle(key: keyof typeof form) {
    setForm((f) => ({ ...f, [key]: !f[key] }))
  }

  /** Use browser Geolocation API to pre-fill lat/lng */
  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by this browser')
      return
    }
    setGeocoding(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }))
        setGeocoding(false)
        toast.success('Location detected')
      },
      () => {
        setGeocoding(false)
        toast.error('Could not detect location — enter coordinates manually')
      }
    )
  }

  async function save() {
    setSaving(true)
    const payload: Record<string, any> = {
      lat:  form.lat  ? parseFloat(form.lat)  : null,
      lng:  form.lng  ? parseFloat(form.lng)  : null,
      postcode: form.postcode,
      state: form.state,
      delivery_enabled_lalamove:   form.delivery_enabled_lalamove,
      delivery_enabled_easyparcel:  form.delivery_enabled_easyparcel,
      delivery_enabled_self_pickup: form.delivery_enabled_self_pickup,
      delivery_free_threshold:  form.delivery_free_threshold  ? parseFloat(form.delivery_free_threshold)  : null,
      delivery_max_radius_km:   form.delivery_max_radius_km   ? parseInt(form.delivery_max_radius_km)     : null,
      delivery_note: form.delivery_note || null,
    }

    const { error } = await supabase
      .from('stores')
      .update(payload)
      .eq('id', storeId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Delivery settings saved')
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* ── Provider Toggles ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Truck size={18} className="text-indigo-500" />
          <h2 className="font-bold text-gray-900">Delivery Providers</h2>
        </div>
        <p className="text-sm text-gray-400 -mt-2">
          Choose which delivery methods are available to your customers at checkout.
        </p>

        <ProviderRow
          icon={<Zap size={18} className="text-orange-500" />}
          bg="bg-orange-100"
          label="Lalamove"
          description="Same-day on-demand delivery (requires store lat/lng below)"
          active={form.delivery_enabled_lalamove}
          onToggle={() => toggle('delivery_enabled_lalamove')}
        />
        <ProviderRow
          icon={<Package size={18} className="text-blue-500" />}
          bg="bg-blue-100"
          label="Easyparcel"
          description="1–5 business days via courier (requires store postcode/state below)"
          active={form.delivery_enabled_easyparcel}
          onToggle={() => toggle('delivery_enabled_easyparcel')}
        />
        <ProviderRow
          icon={<Store size={18} className="text-green-600" />}
          bg="bg-green-100"
          label="Self Pickup"
          description="Customer collects the order from your store — always free"
          active={form.delivery_enabled_self_pickup}
          onToggle={() => toggle('delivery_enabled_self_pickup')}
        />
      </section>

      {/* ── Pickup Location ───────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={18} className="text-indigo-500" />
          <h2 className="font-bold text-gray-900">Pickup / Origin Location</h2>
        </div>
        <p className="text-sm text-gray-400 -mt-2">
          Used to calculate delivery distance (Lalamove) and postcode rates (EasyParcel).
        </p>

        {/* State + Postcode */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">State</label>
            <select
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">— Select state —</option>
              {MY_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Postcode</label>
            <input
              type="text"
              value={form.postcode}
              onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))}
              placeholder="e.g. 50450"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        {/* Lat / Lng with auto-detect */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Latitude <span className="text-gray-400 font-normal">(for Lalamove)</span>
            </label>
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
              placeholder="e.g. 3.1495"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Longitude <span className="text-gray-400 font-normal">(for Lalamove)</span>
            </label>
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
              placeholder="e.g. 101.7035"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={detectLocation}
          disabled={geocoding}
          className="inline-flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-800 disabled:opacity-50"
        >
          <MapPin size={14} />
          {geocoding ? 'Detecting…' : 'Auto-detect my location'}
        </button>
      </section>

      {/* ── Delivery Rules ────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Info size={18} className="text-indigo-500" />
          <h2 className="font-bold text-gray-900">Delivery Rules</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Free Delivery Above (RM)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.delivery_free_threshold}
              onChange={(e) => setForm((f) => ({ ...f, delivery_free_threshold: e.target.value }))}
              placeholder="Leave blank to disable"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <p className="text-xs text-gray-400 mt-1">
              Customers get free delivery when their cart exceeds this amount.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Max Delivery Radius (km)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={form.delivery_max_radius_km}
              onChange={(e) => setForm((f) => ({ ...f, delivery_max_radius_km: e.target.value }))}
              placeholder="Leave blank for unlimited"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <p className="text-xs text-gray-400 mt-1">
              Restrict Lalamove bookings beyond this distance.
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Delivery Note for Customers
          </label>
          <textarea
            value={form.delivery_note}
            onChange={(e) => setForm((f) => ({ ...f, delivery_note: e.target.value }))}
            rows={3}
            placeholder="e.g. We process orders Mon–Fri. Same-day delivery only before 2 PM."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </section>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : 'Save Delivery Settings'}
      </button>
    </div>
  )
}

/* ── small sub-component ── */
function ProviderRow({
  icon, bg, label, description, active, onToggle,
}: {
  icon: React.ReactNode
  bg: string
  label: string
  description: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 leading-snug">{description}</p>
      </div>
      <button type="button" onClick={onToggle} className="shrink-0">
        {active
          ? <ToggleRight size={28} className="text-indigo-600" />
          : <ToggleLeft  size={28} className="text-gray-300"   />}
      </button>
    </div>
  )
}
