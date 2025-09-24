"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Execution {
  id: string;
  executionId: string;
  agentId: string;
  agent: {
    id: string;
    name: string;
  };
  status: string;
  duration: number;
  creditsConsumed: number;
  inputData: unknown;
  outputData: unknown;
  balanceBeforeCents: number | null;
  balanceAfterCents: number | null;
  createdAt: string;
}

export default function HistoryPage() {
  const { status } = useSession();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchExecutions();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const fetchExecutions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/executions/history');
      
      if (response.ok) {
        const data = await response.json();
        setExecutions(data.executions || []);
      } else {
        setError('Failed to fetch execution history');
      }
    } catch (err) {
      setError('Error fetching execution history');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading execution history...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to view your execution history.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Execution History</h1>
              <p className="text-gray-600 mt-1">View your agent execution history and results</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {executions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No executions yet</h3>
            <p className="text-gray-600 mb-6">Start executing agents to see your history here.</p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Agents
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {executions.map((execution) => (
              <div key={execution.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{execution.agent.name}</h3>
                      <p className="text-sm text-gray-500">Execution ID: {execution.executionId}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        execution.status === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {execution.status}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        ${(execution.creditsConsumed / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Input</h4>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                          {execution.inputData ? JSON.stringify(execution.inputData, null, 2) : 'No input data'}
                        </pre>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Output</h4>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                          {execution.outputData ? JSON.stringify(execution.outputData, null, 2) : 'No output data'}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>Duration: {execution.duration}ms</span>
                      {execution.balanceBeforeCents !== null && execution.balanceAfterCents !== null && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">Balance:</span>
                          <span className="font-mono">
                            ${(execution.balanceBeforeCents / 100).toFixed(2)} → ${(execution.balanceAfterCents / 100).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <span>{new Date(execution.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
