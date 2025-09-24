"use client";

import { useState } from "react";

export default function DebugN8nPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [results, setResults] = useState<Array<{
    format: string;
    payload: Record<string, unknown>;
    response: Record<string, unknown> | null;
    success: boolean;
    error?: string;
  }>>([]);
  const [testing, setTesting] = useState(false);

  const testWebhook = async () => {
    if (!webhookUrl.trim()) return;

    setTesting(true);
    setResults([]);

    try {
      const response = await fetch('/api/debug-n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhookUrl }),
      });

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error testing webhook:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug N8N Webhook</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://your-n8n-instance.com/webhook/..."
            />
          </div>
          
          <button
            onClick={testWebhook}
            disabled={!webhookUrl.trim() || testing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? 'Testing...' : 'Test Webhook'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
            {results.map((result, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {result.format}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Payload Sent:</h4>
                    <pre className="bg-gray-50 p-3 rounded text-sm text-gray-900 overflow-x-auto">
                      {JSON.stringify(result.payload, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Response:</h4>
                    <pre className="bg-gray-50 p-3 rounded text-sm text-gray-900 overflow-x-auto">
                      {result.success 
                        ? JSON.stringify(result.response, null, 2)
                        : `Error: ${result.error}`
                      }
                    </pre>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? 'Success' : 'Failed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
