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
  const [webhookUrl, setWebhookUrl] = useState("");
  const [agentName, setAgentName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [instance, setInstance] = useState<N8nInstance | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"webhook" | "api">("webhook");

  const testWebhook = async () => {
    if (!webhookUrl) {
      setError("Please enter a webhook URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/n8n/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setInstance({
          url: webhookUrl,
          name: agentName || "Webhook Agent",
          totalWorkflows: 1,
          activeWorkflows: 1,
          workflows: [{
            id: "webhook-agent",
            name: agentName || "Webhook Agent",
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }]
        });
        setError("");
      } else {
        setError(data.error || "Webhook test failed");
        setInstance(null);
      }
    } catch (err) {
      setError("Network error: " + (err instanceof Error ? err.message : "Unknown error"));
      setInstance(null);
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async () => {
    if (!webhookUrl || !apiKey) {
      setError("Please enter both webhook URL and API key");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Extract base URL from webhook URL
      let baseUrl = webhookUrl;
      if (baseUrl.includes('/webhook/')) {
        baseUrl = baseUrl.split('/webhook/')[0];
      }
      if (baseUrl.includes('/webhook-test/')) {
        baseUrl = baseUrl.split('/webhook-test/')[0];
      }
      if (!baseUrl.endsWith('/')) {
        baseUrl = baseUrl + '/';
      }

      const response = await fetch("/api/n8n/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceUrl: baseUrl,
          apiKey,
          name: instanceName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setInstance(data.instance);
        setError("");
      } else {
        setError(data.error || "Failed to connect to n8n instance");
        setInstance(null);
      }
    } catch (err) {
      setError("Network error: " + (err instanceof Error ? err.message : "Unknown error"));
      setInstance(null);
    } finally {
      setLoading(false);
    }
  };


  const registerAgent = async () => {
    if (!webhookUrl) {
      setError("Please enter a webhook URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/n8n/register-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl,
          name: agentName || "N8n Webhook Agent",
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
          <h3 className="text-xl font-bold text-gray-900">Create N8n Agent</h3>
          <p className="text-gray-700">Connect your n8n webhook to create an AI agent</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setMode("webhook")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "webhook" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Quick Setup (Webhook)
          </button>
          <button
            onClick={() => setMode("api")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "api" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Advanced (API Key)
          </button>
        </div>
      </div>

      {/* Webhook Mode */}
      {mode === "webhook" && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Webhook URL *
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/abc123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get this from your n8n workflow&apos;s webhook node
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="My N8n Agent"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>
        </div>
      )}

      {/* API Mode */}
      {mode === "api" && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Webhook URL *
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/abc123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              API Key *
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your n8n API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Find this in Settings → API Keys in your n8n instance
            </p>
          </div>
          <div>
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
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        {mode === "webhook" ? (
          <>
            <button
              onClick={testWebhook}
              disabled={loading || !webhookUrl || !agentName}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Testing..." : "Test Webhook"}
            </button>
            
            {instance && (
              <button
                onClick={registerAgent}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Creating..." : "Create Agent"}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={testApiConnection}
              disabled={loading || !webhookUrl || !apiKey}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Testing..." : "Test API Connection"}
            </button>
            
            {instance && (
              <button
                onClick={registerAgent}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Creating..." : `Register ${instance.activeWorkflows} Workflows`}
              </button>
            )}
          </>
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

