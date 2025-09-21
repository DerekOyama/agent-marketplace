"use client";

import { useState } from "react";

interface Agent {
  id: string;
  name: string;
  description?: string;
  runUrl: string;
  type?: string;
  n8nWorkflowId?: string;
  n8nInstanceUrl?: string;
  webhookUrl?: string;
  triggerType?: string;
  isActive?: boolean;
  metadata?: any;
  pricing?: any;
  stats?: any;
}

interface AgentCardProps {
  agent: Agent;
  onAction: (action: string, agentId: string) => Promise<void>;
  loading: boolean;
  log: string;
}

export default function AgentCard({ agent, onAction, loading, log }: AgentCardProps) {
  const [localLog, setLocalLog] = useState<string>("");

  const handleAction = async (action: string) => {
    setLocalLog("");
    await onAction(action, agent.id);
    setLocalLog(log);
  };

  const isN8nAgent = agent.type === 'n8n';
  
  const actions = isN8nAgent ? [
    { 
      name: "Execute Workflow", 
      action: "execute", 
      color: "bg-blue-700 hover:bg-blue-800",
      description: "Execute n8n workflow"
    },
    { 
      name: "View in N8n", 
      action: "view", 
      color: "bg-purple-700 hover:bg-purple-800",
      description: "Open workflow in n8n"
    },
    { 
      name: "Test Connection", 
      action: "test", 
      color: "bg-green-700 hover:bg-green-800",
      description: "Test n8n connection"
    }
  ] : [
    { 
      name: "Health Check", 
      action: "health", 
      color: "bg-amber-700 hover:bg-amber-800",
      description: "Check system health"
    },
    { 
      name: "Create Mandate", 
      action: "mandate", 
      color: "bg-amber-600 hover:bg-amber-700",
      description: "Create $20 spending limit"
    },
    { 
      name: "Create Transaction", 
      action: "transaction", 
      color: "bg-green-700 hover:bg-green-800",
      description: "Create $5 transaction"
    },
    { 
      name: "Dispatch Transaction", 
      action: "dispatch", 
      color: "bg-orange-700 hover:bg-orange-800",
      description: "Create & dispatch transaction"
    },
    { 
      name: "Simulate Receipt", 
      action: "receipt", 
      color: "bg-amber-800 hover:bg-amber-900",
      description: "Create & simulate receipt"
    }
  ];

  // Get stats from agent data or use defaults
  const agentStats = agent.stats || {};
  const agentPricing = agent.pricing || {};
  
  // Calculate dynamic stats from agent data
  const totalExecutions = agentStats.totalExecutions || 0;
  const successfulExecutions = agentStats.successfulExecutions || 0;
  const failedExecutions = agentStats.failedExecutions || 0;
  const averageRating = agentStats.averageRating || 0;
  const totalRatings = agentStats.totalRatings || 0;
  const uniqueUsers = agentStats.uniqueUsers || 0;
  const repeatUsers = agentStats.repeatUsers || 0;
  const uptime = agentStats.uptime || "99.9%";
  
  const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;
  const failureRate = totalExecutions > 0 ? Math.round((failedExecutions / totalExecutions) * 100) : 0;
  const repeatClientRate = uniqueUsers > 0 ? Math.min(Math.round((repeatUsers / uniqueUsers) * 100), 100) : 0;
  
  const stats = isN8nAgent ? {
    price: agentPricing.pricePerExecution ? `$${agentPricing.pricePerExecution} per execution` : "Free",
    successRate: `${successRate}%`,
    avgDuration: agentStats.averageExecutionTime ? `${Math.round(agentStats.averageExecutionTime)}ms` : "0ms",
    jobsCompleted: totalExecutions.toString(),
    avgRating: averageRating > 0 ? averageRating.toFixed(1) : "0.0",
    reviewCount: totalRatings.toString(),
    repeatClients: `${repeatClientRate}%`,
    failureRate: `${failureRate}%`,
    uptime: uptime
  } : {
    price: "$25 per site page",
    successRate: "93%",
    avgDuration: "7 minutes",
    jobsCompleted: "420",
    avgRating: "4.6",
    reviewCount: "120",
    repeatClients: "38%",
    failureRate: "3%",
    uptime: "99.2%"
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-lg border border-amber-200 p-4 hover:shadow-xl transition-all duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column - Agent Info & Key Stats */}
        <div className="lg:col-span-2">
          {/* Agent Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-700 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-900">{agent.name}</h3>
                <p className="text-xs text-amber-700 font-mono">ID: {agent.id.slice(0, 8)}...</p>
                {isN8nAgent && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      N8n Workflow
                    </span>
                    {agent.triggerType && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        {agent.triggerType}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-700 font-medium">Active</span>
            </div>
          </div>

          {/* Key Statistics - Compact Grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-white/80 backdrop-blur-sm rounded p-2 border border-amber-300 shadow-sm">
              <p className="text-xs text-amber-800 font-medium">Price</p>
              <p className="text-sm font-bold text-gray-900">{stats.price}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded p-2 border border-amber-300 shadow-sm">
              <p className="text-xs text-amber-800 font-medium">Success</p>
              <p className="text-sm font-bold text-green-800">{stats.successRate} ✅</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded p-2 border border-amber-300 shadow-sm">
              <p className="text-xs text-amber-800 font-medium">Duration</p>
              <p className="text-sm font-bold text-gray-900">{stats.avgDuration}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded p-2 border border-amber-300 shadow-sm">
              <p className="text-xs text-amber-800 font-medium">Jobs</p>
              <p className="text-sm font-bold text-gray-900">{stats.jobsCompleted}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded p-2 border border-amber-300 shadow-sm">
              <p className="text-xs text-amber-800 font-medium">Rating</p>
              <p className="text-sm font-bold text-gray-900">⭐ {stats.avgRating}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded p-2 border border-amber-300 shadow-sm">
              <p className="text-xs text-amber-800 font-medium">Repeat</p>
              <p className="text-sm font-bold text-gray-900">{stats.repeatClients}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded p-2 border border-amber-300 shadow-sm">
              <p className="text-xs text-amber-800 font-medium">Failure</p>
              <p className="text-sm font-bold text-red-700">{stats.failureRate}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded p-2 border border-amber-300 shadow-sm">
              <p className="text-xs text-amber-800 font-medium">Uptime</p>
              <p className="text-sm font-bold text-green-800">{stats.uptime}</p>
            </div>
          </div>

          {/* Agent URL - Compact */}
          <div className="p-2 bg-white/80 backdrop-blur-sm rounded border border-amber-300 shadow-sm">
            <p className="text-xs text-amber-800 font-medium mb-1">Run URL</p>
            <p className="text-xs font-mono text-gray-800 break-all truncate">{agent.runUrl}</p>
          </div>
        </div>

        {/* Right Column - Action Buttons */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 col-span-2 lg:col-span-1">Debug Controls</h4>
            {actions.map((action) => (
              <button
                key={action.action}
                onClick={() => handleAction(action.action)}
                disabled={loading}
                className={`px-3 py-2 rounded-lg text-white text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${action.color} hover:shadow-md`}
                title={action.description}
              >
                {loading ? "..." : action.name}
              </button>
            ))}
          </div>

          {/* Debug Log - Compact */}
          {localLog && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-amber-800 mb-1">Debug Log</h4>
              <pre className="p-2 bg-amber-900 text-amber-100 rounded text-xs overflow-auto max-h-20 font-mono border border-amber-700">
                {localLog}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
