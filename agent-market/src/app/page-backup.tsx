"use client";

export default function HomePageBackup() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Agent Marketplace</h1>
          <p className="text-lg text-gray-800 mb-8">
            Manage and test your AI agents with individual debugging controls
          </p>
          <div className="bg-green-100 p-4 rounded-lg">
            <p className="text-green-800">✅ Basic Next.js deployment is working!</p>
            <p className="text-sm text-gray-600 mt-2">
              Timestamp: {new Date().toISOString()}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
