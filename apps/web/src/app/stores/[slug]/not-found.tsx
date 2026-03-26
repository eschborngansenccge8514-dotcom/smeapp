import Link from 'next/link'

export default function StoreNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-32 h-32 bg-gray-100 rounded-3xl flex items-center justify-center text-6xl mx-auto">
          🏪
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store not found</h1>
          <p className="text-gray-500 mt-2 leading-relaxed">
            This store may have moved, closed, or the link might be incorrect.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            🔍 Browse All Stores
          </Link>
          <Link
            href="/search"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-300 transition-colors"
          >
            ← Back to Search
          </Link>
        </div>
      </div>
    </div>
  )
}
