const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  pending:    { label: 'Pending',    classes: 'bg-yellow-100 text-yellow-700' },
  confirmed:  { label: 'Confirmed',  classes: 'bg-blue-100 text-blue-700' },
  preparing:  { label: 'Preparing',  classes: 'bg-purple-100 text-purple-700' },
  ready:      { label: 'Ready',      classes: 'bg-cyan-100 text-cyan-700' },
  dispatched: { label: 'On the Way', classes: 'bg-indigo-100 text-indigo-700' },
  delivered:  { label: 'Delivered',  classes: 'bg-green-100 text-green-700' },
  cancelled:  { label: 'Cancelled',  classes: 'bg-red-100 text-red-700' },
}

export function OrderStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.classes}`}>
      {s.label}
    </span>
  )
}
