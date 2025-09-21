export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Agent Marketplace</h1>
          <p className="text-lg text-gray-800 mb-8">
            Manage and test your AI agents with individual debugging controls
          </p>
          <div className="bg-green-100 p-4 rounded-lg max-w-md mx-auto">
            <p className="text-green-800 font-semibold">✅ Basic Next.js deployment is working!</p>
            <p className="text-sm text-gray-600 mt-2">
              Timestamp: {new Date().toISOString()}
            </p>
            <div className="mt-4 space-y-2">
              <a 
                href="/api/test" 
                className="block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Test API
              </a>
              <a 
                href="/api/health" 
                className="block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Health Check
              </a>
              <a 
                href="/test-minimal" 
                className="block bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
              >
                Minimal Test
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}