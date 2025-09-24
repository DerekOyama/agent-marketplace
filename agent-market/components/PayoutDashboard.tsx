"use client";

import { useState, useEffect } from "react";

interface PayoutSummary {
  totalEarningsCents: number;
  pendingEarningsCents: number;
  paidOutCents: number;
  totalExecutions: number;
  formatted: {
    totalEarnings: string;
    pendingEarnings: string;
    paidOut: string;
  };
}

interface AgentBreakdown {
  agentId: string;
  agentName: string;
  totalEarningsCents: number;
  pendingEarningsCents: number;
  totalExecutions: number;
  lastEarningAt: string | null;
  formatted: {
    totalEarnings: string;
    pendingEarnings: string;
    lastEarningAt: string | null;
  };
}

interface PayoutHistory {
  id: string;
  amountCents: number;
  status: string;
  description: string | null;
  createdAt: string;
  processedAt: string | null;
  failureReason: string | null;
  formatted: {
    amount: string;
    createdAt: string;
    processedAt: string | null;
  };
}

export default function PayoutDashboard() {
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [agentBreakdown, setAgentBreakdown] = useState<AgentBreakdown[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'history'>('summary');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutDescription, setPayoutDescription] = useState('');
  const [creatingPayout, setCreatingPayout] = useState(false);

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/payouts?type=summary');
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.data.earnings);
        setAgentBreakdown(data.data.agentBreakdown);
      } else {
        setError(data.message || 'Failed to fetch earnings summary');
      }
    } catch {
      setError('Failed to fetch earnings summary');
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/payouts?type=history');
      const data = await response.json();
      
      if (data.success) {
        setPayoutHistory(data.data.payouts);
      } else {
        setError(data.message || 'Failed to fetch payout history');
      }
    } catch {
      setError('Failed to fetch payout history');
    }
  };

  const createPayout = async () => {
    const amountCents = Math.round(parseFloat(payoutAmount) * 100);
    
    if (!amountCents || amountCents <= 0) {
      setError('Please enter a valid payout amount');
      return;
    }

    if (amountCents < 500) { // $5.00 minimum
      setError('Minimum payout amount is $5.00');
      return;
    }

    setCreatingPayout(true);
    try {
      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          description: payoutDescription || undefined
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setPayoutAmount('');
        setPayoutDescription('');
        await fetchSummary(); // Refresh summary
        await fetchHistory(); // Refresh history
      } else {
        setError(data.message || 'Failed to create payout request');
      }
    } catch {
      setError('Failed to create payout request');
    } finally {
      setCreatingPayout(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchHistory()]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Earnings & Payouts</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              History
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-600 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'summary' && summary && (
          <div className="space-y-6">
            {/* Earnings Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">Total Earnings</p>
                    <p className="text-2xl font-semibold text-green-900">{summary.formatted.totalEarnings}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">Pending</p>
                    <p className="text-2xl font-semibold text-blue-900">{summary.formatted.pendingEarnings}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-800">Paid Out</p>
                    <p className="text-2xl font-semibold text-purple-900">{summary.formatted.paidOut}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Breakdown */}
            {agentBreakdown.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Earnings by Agent</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Agent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Earnings
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pending
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Executions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Earning
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {agentBreakdown.map((agent) => (
                        <tr key={agent.agentId}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{agent.agentName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {agent.formatted.totalEarnings}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            {agent.formatted.pendingEarnings}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {agent.totalExecutions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {agent.formatted.lastEarningAt ? 
                              new Date(agent.formatted.lastEarningAt).toLocaleDateString() : 
                              'Never'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Create Payout */}
            {summary.pendingEarningsCents > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Request Payout</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="payout-amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (USD)
                    </label>
                    <input
                      type="number"
                      id="payout-amount"
                      step="0.01"
                      min="0.01"
                      max={summary.pendingEarningsCents / 100}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max: {summary.formatted.pendingEarnings} | Min: $5.00
                    </p>
                  </div>
                  <div>
                    <label htmlFor="payout-description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      id="payout-description"
                      value={payoutDescription}
                      onChange={(e) => setPayoutDescription(e.target.value)}
                      placeholder="e.g., Monthly payout"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={createPayout}
                    disabled={creatingPayout || !payoutAmount}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {creatingPayout ? 'Creating...' : 'Request Payout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payout History</h3>
            {payoutHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Processed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payoutHistory.map((payout) => (
                      <tr key={payout.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payout.formatted.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                            payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            payout.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payout.description || 'No description'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payout.formatted.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payout.formatted.processedAt ? 
                            new Date(payout.formatted.processedAt).toLocaleDateString() : 
                            '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No payout history</h3>
                <p className="mt-1 text-sm text-gray-500">You haven&apos;t requested any payouts yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
