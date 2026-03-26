'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Operator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'in'
interface Condition {
  field: string; operator: Operator; value: string | number
}

const FIELDS = [
  { value: 'total_spent',     label: 'Total Spent (RM)',    type: 'number' },
  { value: 'total_orders',    label: 'Total Orders',        type: 'number' },
  { value: 'avg_order_value', label: 'Average Order Value', type: 'number' },
  { value: 'last_order_at',   label: 'Days Since Last Order', type: 'number' },
  { value: 'tags',            label: 'Has Tag',             type: 'text' },
  { value: 'segment',         label: 'Current Segment',     type: 'select', options: ['vip','loyal','new','at_risk','inactive'] },
  { value: 'is_subscribed',   label: 'Email Subscribed',    type: 'boolean' },
]

const OPERATORS: Record<string, { value: Operator; label: string }[]> = {
  number: [
    { value: 'gt',  label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt',  label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'eq',  label: '=' },
  ],
  text:    [{ value: 'contains', label: 'Contains' }, { value: 'eq', label: 'Is exactly' }],
  select:  [{ value: 'eq', label: 'Is' }, { value: 'in', label: 'Is one of' }],
  boolean: [{ value: 'eq', label: 'Is' }],
}

interface Props {
  storeId: string
  primaryColor: string
  onSaved: () => void
}

export function CrmSegmentBuilder({ storeId, primaryColor, onSaved }: Props) {
  const [name, setName]               = useState('')
  const [conditions, setConditions]   = useState<Condition[]>([{ field: 'total_spent', operator: 'gte', value: '' }])
  const [logic, setLogic]             = useState<'AND' | 'OR'>('AND')
  const [saving, setSaving]           = useState(false)
  const [previewCount, setPreviewCount]= useState<number | null>(null)
  const supabase = createClient()

  function addCondition() {
    setConditions((p) => [...p, { field: 'total_spent', operator: 'gte', value: '' }])
  }

  function removeCondition(i: number) {
    setConditions((p) => p.filter((_, idx) => idx !== i))
  }

  function updateCondition(i: number, updates: Partial<Condition>) {
    setConditions((p) => p.map((c, idx) => idx === i ? { ...c, ...updates } : c))
  }

  async function preview() {
    // Build a count query based on conditions
    let query = supabase
      .from('crm_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)

    conditions.forEach((cond) => {
      const val = cond.value
      if (val === '' || val === null) return
      switch (cond.operator) {
        case 'gt':  query = query.gt(cond.field, val); break
        case 'gte': query = query.gte(cond.field, val); break
        case 'lt':  query = query.lt(cond.field, val); break
        case 'lte': query = query.lte(cond.field, val); break
        case 'eq':  query = query.eq(cond.field, val); break
        case 'contains': query = query.ilike(cond.field, `%${val}%`); break
      }
    })

    const { count } = await query
    setPreviewCount(count ?? 0)
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('crm_segments').insert({
      store_id: storeId,
      name: name.trim(),
      conditions,
      contact_count: previewCount ?? 0,
      is_dynamic: true,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="space-y-5">
      {/* Segment name */}
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
          Segment Name *
        </label>
        <input
          type="text"
          placeholder="e.g. High-Value Customers, 90-Day Inactive"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400"
          style={{ '--tw-ring-color': primaryColor } as any}
        />
      </div>

      {/* Logic operator */}
      <div className="flex items-center gap-3">
        <p className="text-xs font-bold text-gray-600">Match</p>
        {(['AND', 'OR'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLogic(l)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
              logic === l ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
            }`}
            style={logic === l ? { backgroundColor: primaryColor } : {}}
          >
            {l}
          </button>
        ))}
        <p className="text-xs text-gray-400">of the following conditions</p>
      </div>

      {/* Conditions */}
      <div className="space-y-2.5">
        {conditions.map((cond, i) => {
          const fieldDef = FIELDS.find((f) => f.value === cond.field)!
          const ops = OPERATORS[fieldDef.type] ?? []

          return (
            <div key={i} className="flex gap-2 items-center bg-gray-50 rounded-2xl px-3 py-3 border border-gray-100">
              {/* Field */}
              <select
                value={cond.field}
                onChange={(e) => updateCondition(i, {
                  field: e.target.value,
                  operator: OPERATORS[FIELDS.find((f) => f.value === e.target.value)?.type ?? 'number'][0].value,
                  value: '',
                })}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-white text-gray-800"
              >
                {FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={cond.operator}
                onChange={(e) => updateCondition(i, { operator: e.target.value as Operator })}
                className="w-20 border border-gray-200 rounded-xl px-2 py-2 text-xs focus:outline-none bg-white text-gray-800"
              >
                {ops.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Value */}
              {fieldDef.type === 'boolean' ? (
                <select
                  value={String(cond.value)}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                  className="w-24 border border-gray-200 rounded-xl px-2 py-2 text-xs focus:outline-none bg-white text-gray-800"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : fieldDef.type === 'select' ? (
                <select
                  value={String(cond.value)}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                  className="w-28 border border-gray-200 rounded-xl px-2 py-2 text-xs focus:outline-none bg-white text-gray-800"
                >
                  {fieldDef.options?.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={fieldDef.type === 'number' ? 'number' : 'text'}
                  value={String(cond.value)}
                  onChange={(e) => updateCondition(i, { value: fieldDef.type === 'number' ? +e.target.value : e.target.value })}
                  placeholder="Value"
                  className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-white text-gray-900 placeholder-gray-400"
                />
              )}

              {/* Remove */}
              <button
                onClick={() => removeCondition(i)}
                disabled={conditions.length === 1}
                className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30 font-bold"
              >
                ✕
              </button>
            </div>
          )
        })}

        <button
          onClick={addCondition}
          className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-xs font-bold text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all"
        >
          + Add Condition
        </button>
      </div>

      {/* Preview count */}
      {previewCount !== null && (
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
          style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}25` }}
        >
          <span className="text-xl">👥</span>
          <div>
            <p className="text-sm font-bold" style={{ color: primaryColor }}>
              {previewCount} contact{previewCount !== 1 ? 's' : ''} match this segment
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              This segment will update dynamically as customer data changes.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={preview}
          className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-700 hover:border-gray-300 transition-all"
        >
          👁️ Preview Audience
        </button>
        <button
          onClick={save}
          disabled={!name.trim() || saving}
          className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60 shadow-md"
          style={{ backgroundColor: primaryColor }}
        >
          {saving ? 'Saving…' : '💾 Save Segment'}
        </button>
      </div>
    </div>
  )
}
