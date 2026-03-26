import Link from 'next/link'

export default function OrderNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-28 h-28 bg-orange-50 rounded-3xl flex items-center justify-center text-5xl mx-auto">
          📦
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order not found</h1>
          <p className="text-gray-500 mt-2 leading-relaxed">
            This order doesn't exist, may have been removed, or you may not have permission to view it.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-left">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">
            Common reasons
          </p>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            <li>The order link has expired</li>
            <li>You're not signed in to the right account</li>
            <li>The order ID in the URL is incorrect</li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/orders"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            📋 View My Orders
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-300 transition-colors"
          >
            🔍 Back to Search
          </Link>
        </div>
      </div>
    </div>
  )
}
