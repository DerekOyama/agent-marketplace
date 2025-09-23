"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PendingAgent {
  webhookUrl: string;
  name: string;
  inputRequirements: string;
  pricePerExecutionCents: number;
  apiKey?: string;
  instanceName?: string;
}

export default function N8nVerificationPage() {
  const { status } = useSession();
  const router = useRouter();
  const [agentData, setAgentData] = useState<PendingAgent | null>(null);
  const [exampleInput, setExampleInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (status === "unauthenticated") {
      router.push("/n8n");
      return;
    }

    // Load pending agent data from sessionStorage
    try {
      const stored = sessionStorage.getItem("pendingAgentVerification");
      if (stored) {
        setAgentData(JSON.parse(stored));
      } else {
        router.push("/n8n");
      }
    } catch (err) {
      console.error("Failed to load agent data:", err);
      router.push("/n8n");
    }
  }, [status, router]);

  const testAgent = async () => {
    if (!agentData || !exampleInput || !exampleInput.trim()) {
      setError("Please provide example input to test your agent");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/n8n/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: agentData.webhookUrl,
          testData: {
            input: exampleInput.trim(),
            timestamp: new Date().toISOString(),
            testMode: true
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestOutput(data.output || "Agent responded successfully");
        setError("");
      } else {
        setError(data.error || "Agent test failed");
        setTestOutput("");
      }
    } catch (err) {
      setError("Network error: " + (err instanceof Error ? err.message : "Unknown error"));
      setTestOutput("");
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async () => {
    if (!agentData || !exampleInput || !exampleInput.trim() || !testOutput || !testOutput.trim()) {
      setError("Please test your agent with example input/output before creating");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/n8n/register-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...agentData,
          exampleInput: exampleInput.trim(),
          exampleOutput: testOutput.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowSuccess(true);
        // Clear the stored data
        sessionStorage.removeItem("pendingAgentVerification");
        
        // Redirect to main page after 3 seconds
        setTimeout(() => {
          router.push("/");
        }, 3000);
      } else {
        setError(data.error || "Failed to create agent");
      }
    } catch (err) {
      setError("Network error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!agentData) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No Agent Data Found</h1>
            <p className="text-gray-600 mb-6">Please go back and create an agent first.</p>
            <Link
              href="/n8n"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Back to N8n Integration
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/n8n"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              ← Back to Setup
            </Link>
            <h1 className="text-4xl font-bold text-gray-900">Verify Your Agent</h1>
            <div className="w-32"></div>
          </div>
          <p className="text-lg text-gray-800 mb-6">
            Test your agent with example input to ensure it works correctly before going live
          </p>
        </div>

        {/* Success Animation */}
        {showSuccess && (
          <div className="max-w-3xl mx-auto mb-8 bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <strong className="font-bold">Agent Created Successfully!</strong>
                <span className="block sm:inline ml-2">Your agent is now live in the marketplace. Redirecting...</span>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {/* Agent Details */}
          <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Agent Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-800">Name:</span>
                <p className="text-gray-900 font-semibold">{agentData.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-800">Price:</span>
                <p className="text-gray-900 font-semibold">${(agentData.pricePerExecutionCents / 100).toFixed(2)} per execution</p>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-gray-800">Input Requirements:</span>
                <p className="text-gray-900">{agentData.inputRequirements}</p>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-gray-800">Webhook URL:</span>
                <p className="text-gray-900 font-mono text-xs break-all bg-gray-100 p-2 rounded">{agentData.webhookUrl}</p>
              </div>
            </div>
          </div>

          {/* Test Section */}
          <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Test Your Agent</h3>
            <p className="text-gray-600 mb-6">
              Provide example input that matches your agent&apos;s requirements. This will be used as an example for users.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Example Input *
                </label>
                <textarea
                  value={exampleInput}
                  onChange={(e) => setExampleInput(e.target.value)}
                  placeholder={`Example: ${agentData.inputRequirements}`}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be shown to users as an example of what to provide
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={testAgent}
                  disabled={loading || !exampleInput || !exampleInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Testing..." : "Test Agent"}
                </button>
              </div>

              {testOutput && (
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Agent Output
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 min-h-[100px] whitespace-pre-wrap">
                    {testOutput}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This will be shown to users as an example of what your agent returns
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Create Agent Button */}
          <div className="text-center">
            <button
              onClick={createAgent}
              disabled={loading || !exampleInput || !exampleInput.trim() || !testOutput || !testOutput.trim() || showSuccess}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-lg"
            >
              {loading ? "Creating Agent..." : showSuccess ? "Agent Created!" : "Create Agent & Go Live"}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Your agent will be published to the marketplace after verification
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
