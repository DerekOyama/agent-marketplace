"use client";

import N8nDiscovery from "../../components/N8nDiscovery";
import Link from "next/link";
import CreditBalance from "../../components/CreditBalance";

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
            <div className="flex items-center space-x-4">
              <CreditBalance />
            </div>
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">How to Create N8n Agents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Quick Setup (Recommended)</h4>
                <p className="text-gray-600 text-sm mb-2">
                  Just provide your webhook URL and agent name. No API key needed!
                </p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• Copy webhook URL from n8n workflow</li>
                  <li>• Enter a name for your agent</li>
                  <li>• Click &quot;Test Webhook&quot;</li>
                  <li>• Click &quot;Create Agent&quot;</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Advanced Setup</h4>
                <p className="text-gray-600 text-sm mb-2">
                  Use API key for workflow discovery and advanced features.
                </p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• Enter webhook URL and API key</li>
                  <li>• Click &quot;Test API Connection&quot;</li>
                  <li>• Discover multiple workflows</li>
                  <li>• Register all workflows as agents</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Getting Your Webhook URL</h4>
              <ol className="text-blue-800 text-sm space-y-1">
                <li>1. Open your n8n workflow</li>
                <li>2. Add a &quot;Webhook&quot; node</li>
                <li>3. Copy the webhook URL from the node</li>
                <li>4. Paste it in the form above</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
