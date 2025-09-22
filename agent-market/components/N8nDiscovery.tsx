"use client";

import { useState } from "react";

interface N8nInstance {
  url: string;
  name: string;
  totalWorkflows: number;
  activeWorkflows: number;
  workflows: Array<{
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

export default function N8nDiscovery() {
  const [instanceUrl, setInstanceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [instance, setInstance] = useState<N8nInstance | null>(null);
  const [error, setError] = useState("");

  const testConnection = async () => {
    if (!instanceUrl || !apiKey) {
      setError("Please enter both instance URL and API key");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Clean up the instance URL - remove webhook paths and ensure it's the base URL
      let cleanUrl = instanceUrl;
      if (cleanUrl.includes('/webhook/')) {
        cleanUrl = cleanUrl.split('/webhook/')[0];
      }
      if (cleanUrl.includes('/webhook-test/')) {
        cleanUrl = cleanUrl.split('/webhook-test/')[0];
      }
      if (!cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl + '/';
      }

      console.log('Cleaned URL:', cleanUrl);

      const response = await fetch("/api/n8n/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceUrl: cleanUrl,
          apiKey,
          name: instanceName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setInstance(data.instance);
        setError(""); // Clear any previous errors
      } else {
        setError(data.error || "Failed to connect to n8n instance");
        setInstance(null); // Clear instance on error
      }
    } catch (err) {
      setError("Network error: " + (err instanceof Error ? err.message : "Unknown error"));
      setInstance(null); // Clear instance on error
    } finally {
      setLoading(false);
    }
  };

  // Alternative: Test webhook connection via server proxy
  const testWebhookConnection = async () => {
    if (!instanceUrl) {
      setError("Please enter a webhook URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Test the webhook via server-side proxy to avoid CORS issues
      const response = await fetch("/api/n8n/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: instanceUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setInstance({
          url: instanceUrl,
          name: instanceName || "Webhook Instance",
          totalWorkflows: 1,
          activeWorkflows: 1,
          workflows: [{
            id: "webhook-test",
            name: "Webhook Test",
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }]
        });
        setError(""); // Clear any previous errors
      } else {
        // Even if webhook test fails, create a test agent if we got a response
        if (data.status === 404 && data.error && data.error.includes("webhook")) {
          setInstance({
            url: instanceUrl,
            name: instanceName || "Webhook Instance (Needs Activation)",
            totalWorkflows: 1,
            activeWorkflows: 0,
            workflows: [{
              id: "webhook-test",
              name: "Webhook Test (Click 'Execute workflow' in n8n first)",
              active: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }]
          });
          setError("Webhook needs activation: Click 'Execute workflow' in n8n first, then try again");
        } else {
          setError(data.message || `Webhook test failed: ${data.status} ${data.statusText}`);
        }
      }
    } catch (err) {
      setError("Webhook test failed: " + (err instanceof Error ? err.message : "Unknown error"));
      setInstance(null); // Clear instance on error
    } finally {
      setLoading(false);
    }
  };

  const discoverWorkflows = async () => {
    if (!instanceUrl) {
      setError("Please enter a webhook URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // For webhook-based workflows, we'll create a simple agent directly
      const response = await fetch("/api/n8n/register-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: instanceUrl,
          name: instanceName || "N8n Webhook Agent",
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully registered webhook as agent!`);
        // Refresh the page to show new agents
        window.location.reload();
      } else {
        setError(data.error || "Failed to register webhook as agent");
      }
    } catch (err) {
      setError("Network error: " + (err instanceof Error ? err.message : "Unknown error"));
      setInstance(null); // Clear instance on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-6 mb-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Connect N8n Instance</h3>
          <p className="text-gray-700">Discover and register n8n workflows as AI agents</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-2">
            N8n Instance URL
          </label>
          <input
            type="url"
            value={instanceUrl}
            onChange={(e) => setInstanceUrl(e.target.value)}
            placeholder="https://your-n8n-instance.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-2">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Your n8n API key"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-800 mb-2">
          Instance Name (Optional)
        </label>
        <input
          type="text"
          value={instanceName}
          onChange={(e) => setInstanceName(e.target.value)}
          placeholder="My N8n Instance"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={testConnection}
          disabled={loading}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Testing..." : "Test API Connection"}
        </button>
        
        <button
          onClick={testWebhookConnection}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Testing..." : "Test Webhook"}
        </button>
        
        {instance && (
          <button
            onClick={discoverWorkflows}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Discovering..." : `Register ${instance.activeWorkflows} Workflows`}
          </button>
        )}
      </div>

      {instance && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">Connection Successful!</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-800 font-medium">Instance:</span>
              <p className="text-green-900 font-semibold">{instance.name}</p>
            </div>
            <div>
              <span className="text-green-800 font-medium">Total Workflows:</span>
              <p className="text-green-900 font-semibold">{instance.totalWorkflows}</p>
            </div>
            <div>
              <span className="text-green-800 font-medium">Active Workflows:</span>
              <p className="text-green-900 font-semibold">{instance.activeWorkflows}</p>
            </div>
            <div>
              <span className="text-green-800 font-medium">URL:</span>
              <p className="text-green-900 font-mono text-xs break-all bg-white/50 p-1 rounded">{instance.url}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

