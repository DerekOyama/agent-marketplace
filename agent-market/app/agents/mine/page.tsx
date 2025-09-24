"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PayoutConfig {
  minimumPayoutCents: number;
  platformFeePercentage: number;
  creatorEarningsPercentage: number;
  formatted: {
    minimumPayout: string;
    platformFeePercentage: string;
    creatorEarningsPercentage: string;
  };
}

interface EarningsSummary {
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

interface AgentMetric {
  agentId: string;
  agentName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalRevenueCents: number;
  creatorEarningsCents: number;
  platformFeeCents: number;
  averageExecutionCost: number;
  lastExecutionAt: Date | null;
  createdAt: Date;
  formatted: {
    totalRevenue: string;
    creatorEarnings: string;
    platformFee: string;
    averageExecutionCost: string;
    lastExecutionAt: string | null;
  };
}

export default function MyAgentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutConfig, setPayoutConfig] = useState<PayoutConfig | null>(null);
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/agents/mine/metrics');
        const data = await response.json();
        
        if (data.success) {
          setPayoutConfig(data.data.payoutConfig);
          setEarningsSummary(data.data.earningsSummary);
          setAgentMetrics(data.data.agentMetrics);
        } else {
          setError(data.message || 'Failed to fetch agent metrics');
        }
      } catch {
        setError('Failed to fetch agent metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-4xl font-bold mb-2">My Agents Dashboard</h1>
              <p className="text-purple-100 text-lg">
                Track your agent performance and earnings
              </p>
            </div>
            
            {/* Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <Link
                href="/"
                className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium text-sm flex items-center space-x-2 shadow-lg"
              >
                <span>Back to Marketplace</span>
              </Link>
              <Link
                href="/payouts"
                className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium text-sm flex items-center space-x-2 shadow-lg"
              >
                <span>Earnings & Payouts</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Earnings Overview */}
        {earningsSummary && payoutConfig && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Earnings Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <p className="text-sm font-medium text-green-800">Total Earnings</p>
                <p className="text-3xl font-bold text-green-900">{earningsSummary.formatted.totalEarnings}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-sm font-medium text-blue-800">Pending</p>
                <p className="text-3xl font-bold text-blue-900">{earningsSummary.formatted.pendingEarnings}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <p className="text-sm font-medium text-purple-800">Paid Out</p>
                <p className="text-3xl font-bold text-purple-900">{earningsSummary.formatted.paidOut}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-sm font-medium text-gray-800">Total Executions</p>
                <p className="text-3xl font-bold text-gray-900">{earningsSummary.totalExecutions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Agent Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Agent Performance</h2>
          {agentMetrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Executions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Success Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Your Earnings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform Fee
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agentMetrics.map((agent) => {
                    const successRate = agent.totalExecutions > 0 
                      ? Math.round((agent.successfulExecutions / agent.totalExecutions) * 100)
                      : 0;
                    
                    return (
                      <tr key={agent.agentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{agent.agentName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agent.totalExecutions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            successRate >= 90 ? 'bg-green-100 text-green-800' :
                            successRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {successRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {agent.formatted.totalRevenue}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {agent.formatted.creatorEarnings}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {agent.formatted.platformFee}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No agents found</h3>
              <p className="mt-1 text-sm text-gray-500">
                You haven&apos;t created any agents yet. Create your first agent to start earning!
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}