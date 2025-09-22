"use client";

import N8nDiscovery from "../../components/N8nDiscovery";
import Link from "next/link";

export default function N8nPage() {

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link 
              href="/" 
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              ← Back to Agents
            </Link>
            <h1 className="text-4xl font-bold text-gray-900">N8n Integration</h1>
            <div className="w-32"></div> {/* Spacer for centering */}
          </div>
          <p className="text-lg text-gray-800 mb-6">
            Connect your n8n instances and discover workflows to register as AI agents
          </p>
        </div>

        {/* N8n Discovery Component */}
        <div className="max-w-4xl mx-auto">
          <N8nDiscovery />
        </div>

        {/* Additional Information */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">How to Use N8n Integration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">API Connection</h4>
                <p className="text-gray-600 text-sm mb-2">
                  Connect using your n8n instance URL and API key to discover all available workflows.
                </p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• Enter your n8n instance base URL</li>
                  <li>• Provide your API key</li>
                  <li>• Click &quot;Test API Connection&quot;</li>
                  <li>• Register workflows as agents</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Webhook Connection</h4>
                <p className="text-gray-600 text-sm mb-2">
                  Test and register individual webhook URLs directly.
                </p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• Enter your webhook URL</li>
                  <li>• Click &quot;Test Webhook&quot;</li>
                  <li>• Register as an agent</li>
                  <li>• Execute from the main marketplace</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
