const STATUS_STYLES: Record<string, string> = {
  // Orders
  pending:      'bg-yellow-100 text-yellow-800',
  confirmed:    'bg-blue-100 text-blue-800',
  preparing:    'bg-orange-100 text-orange-800',
  ready:        'bg-indigo-100 text-indigo-800',
  dispatched:   'bg-purple-100 text-purple-800',
  delivered:    'bg-green-100 text-green-800',
  cancelled:    'bg-red-100 text-red-800',
  // Stores
  active:       'bg-green-100 text-green-800',
  inactive:     'bg-gray-100 text-gray-600',
  suspended:    'bg-red-100 text-red-800',
  // Payments
  paid:         'bg-green-100 text-green-800',
  failed:       'bg-red-100 text-red-800',
  refunded:     'bg-purple-100 text-purple-800',
  // Disputes
  open:         'bg-red-100 text-red-700',
  under_review: 'bg-amber-100 text-amber-700',
  resolved:     'bg-green-100 text-green-700',
  closed:       'bg-gray-100 text-gray-600',
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
