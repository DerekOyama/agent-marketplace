"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

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
  const { status } = useSession();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [agentName, setAgentName] = useState("");
  const [inputRequirements, setInputRequirements] = useState("");
  const [pricePerExecution, setPricePerExecution] = useState("");
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


  const proceedToVerification = () => {
    if (!webhookUrl) {
      setError("Please enter a webhook URL");
      return;
    }

    if (!agentName.trim()) {
      setError("Please enter an agent name");
      return;
    }

    if (!inputRequirements.trim()) {
      setError("Please describe what inputs your agent needs");
      return;
    }

    if (!pricePerExecution || isNaN(Number(pricePerExecution)) || Number(pricePerExecution) < 0) {
      setError("Please enter a valid price per execution (in dollars)");
      return;
    }

    // Store agent data in sessionStorage for verification page
    const agentData = {
      webhookUrl,
      name: agentName.trim(),
      inputRequirements: inputRequirements.trim(),
      pricePerExecutionCents: Math.round(Number(pricePerExecution) * 100),
      apiKey: mode === "api" ? apiKey : null,
      instanceName: mode === "api" ? instanceName : null,
    };

    try {
      sessionStorage.setItem("pendingAgentVerification", JSON.stringify(agentData));
      // Redirect to verification page
      window.location.href = "/n8n/verify";
    } catch {
      setError("Failed to save agent data. Please try again.");
    }
  };

  // Show sign-in prompt if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-6 mb-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h3>
          <p className="text-gray-600 mb-6">
            Please sign in with your Google account to create and manage n8n agents.
          </p>
          <button
            onClick={() => signIn("google")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Show loading if session is loading
  if (status === "loading") {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-6 mb-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Input Requirements *
            </label>
            <textarea
              value={inputRequirements}
              onChange={(e) => setInputRequirements(e.target.value)}
              placeholder="Describe what inputs your agent needs. For example: 'Email address, message content, and recipient name' or 'Product name, price, and description'"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This helps users understand what to provide when using your agent
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Price Per Execution *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pricePerExecution}
                onChange={(e) => setPricePerExecution(e.target.value)}
                placeholder="0.50"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Set the price users will pay each time they run your agent
            </p>
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
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Input Requirements *
            </label>
            <textarea
              value={inputRequirements}
              onChange={(e) => setInputRequirements(e.target.value)}
              placeholder="Describe what inputs your agent needs. For example: 'Email address, message content, and recipient name' or 'Product name, price, and description'"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This helps users understand what to provide when using your agent
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Price Per Execution *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pricePerExecution}
                onChange={(e) => setPricePerExecution(e.target.value)}
                placeholder="0.50"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Set the price users will pay each time they run your agent
            </p>
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
            
            <button
              onClick={proceedToVerification}
              disabled={loading || !webhookUrl || !agentName.trim() || !inputRequirements.trim() || !pricePerExecution}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Processing..." : "Verify & Create Agent"}
            </button>
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
            
            <button
              onClick={proceedToVerification}
              disabled={loading || !webhookUrl || !agentName.trim() || !inputRequirements.trim() || !pricePerExecution}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Processing..." : "Verify & Create Agent"}
            </button>
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

