import Link from "next/link";

export default function SimplePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/" 
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            ← Back to Agents
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">Simple Test Page</h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-8">
            <p className="text-lg text-gray-800 mb-4">
              This is a basic Next.js page to test deployment.
            </p>
            <p className="text-gray-600">
              Timestamp: {new Date().toISOString()}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
