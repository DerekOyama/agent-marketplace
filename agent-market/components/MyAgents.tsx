"use client";

import { useState, useEffect } from "react";

interface AgentRevenue {
  id: string;
  name: string;
  description: string;
  totalExecutions: number;
  totalRevenueCents: number;
  platformFeeCents: number;
  creatorEarningsCents: number;
  lastExecutionAt: string | null;
  isActive: boolean;
  formatted: {
    totalRevenue: string;
    platformFee: string;
    creatorEarnings: string;
    lastExecutionAt: string | null;
  };
}

interface MyAgentsProps {
  refreshTrigger?: number;
}

export default function MyAgents({ refreshTrigger }: MyAgentsProps) {
  const [agents, setAgents] = useState<AgentRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/agents/mine/revenue");
      const data = await response.json();

      console.log("MyAgents fetch response:", data); // Debug log

      if (data.success) {
        setAgents(data.data.agents || []);
        setError(null);
      } else {
        setError(data.message || "Failed to fetch your agents");
      }
    } catch (err) {
      console.error("MyAgents fetch error:", err);
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAgents();
  }, [refreshTrigger]);

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? "Active" : "Inactive";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-300 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">My Agents</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-300 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">My Agents</h3>
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-red-600 font-medium">Error loading agents</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
          <button
            onClick={fetchMyAgents}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-300 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">My Agents</h3>
        <button
          onClick={fetchMyAgents}
          className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Refresh
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-700 mb-2">🤖</div>
          <p className="text-gray-900 font-medium">No agents found</p>
          <p className="text-sm text-gray-600 mt-1">Create your first agent to start earning revenue</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      agent.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {getStatusText(agent.isActive)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                  <p className="text-xs text-gray-500">
                    Last execution: {formatDate(agent.lastExecutionAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {agent.totalExecutions}
                  </div>
                  <div className="text-xs text-gray-600">Total Executions</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    ${formatAmount(agent.totalRevenueCents)}
                  </div>
                  <div className="text-xs text-gray-600">Total Revenue</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    -${formatAmount(agent.platformFeeCents)}
                  </div>
                  <div className="text-xs text-gray-600">Platform Fee (10%)</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    ${formatAmount(agent.creatorEarningsCents)}
                  </div>
                  <div className="text-xs text-gray-600">Your Earnings (90%)</div>
                </div>
              </div>

              {agent.totalExecutions > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Revenue per execution:</span>
                    <span className="font-medium">
                      ${formatAmount(agent.totalRevenueCents / agent.totalExecutions)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Your earnings per execution:</span>
                    <span className="font-medium text-green-600">
                      ${formatAmount(agent.creatorEarningsCents / agent.totalExecutions)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {agents.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {agents.reduce((sum, agent) => sum + agent.totalExecutions, 0)}
              </div>
              <div className="text-xs text-gray-600">Total Executions</div>
            </div>
            
            <div>
              <div className="text-xl font-bold text-gray-900">
                ${formatAmount(agents.reduce((sum, agent) => sum + agent.totalRevenueCents, 0))}
              </div>
              <div className="text-xs text-gray-600">Total Revenue</div>
            </div>
            
            <div>
              <div className="text-xl font-bold text-red-600">
                -${formatAmount(agents.reduce((sum, agent) => sum + agent.platformFeeCents, 0))}
              </div>
              <div className="text-xs text-gray-600">Platform Fees</div>
            </div>
            
            <div>
              <div className="text-xl font-bold text-green-600">
                ${formatAmount(agents.reduce((sum, agent) => sum + agent.creatorEarningsCents, 0))}
              </div>
              <div className="text-xs text-gray-600">Your Total Earnings</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
