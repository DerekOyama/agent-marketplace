"use client";

import { useState } from "react";
import AgentRequirementsModal from "./AgentRequirementsModal";

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
  metadata?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

interface AgentCardProps {
  agent: Agent;
  onAction: (action: string, agentId: string) => Promise<void>;
  loading: boolean;
  log: string;
}

export default function AgentCard({ agent, onAction, loading, log }: AgentCardProps) {
  const [localLog, setLocalLog] = useState<string>("");
  const [showRequirements, setShowRequirements] = useState(false);

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
      name: "View Requirements", 
      action: "requirements", 
      color: "bg-indigo-700 hover:bg-indigo-800",
      description: "View input/output requirements"
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
      name: "View Requirements", 
      action: "requirements", 
      color: "bg-indigo-700 hover:bg-indigo-800",
      description: "View input/output requirements"
    },
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
  const totalExecutions = Number(agentStats.totalExecutions) || 0;
  const successfulExecutions = Number(agentStats.successfulExecutions) || 0;
  const failedExecutions = Number(agentStats.failedExecutions) || 0;
  const averageRating = Number(agentStats.averageRating) || 0;
  const totalRatings = Number(agentStats.totalRatings) || 0;
  const uniqueUsers = Number(agentStats.uniqueUsers) || 0;
  const repeatUsers = Number(agentStats.repeatUsers) || 0;
  const uptime = String(agentStats.uptime || "99.9%");
  
  const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;
  const failureRate = totalExecutions > 0 ? Math.round((failedExecutions / totalExecutions) * 100) : 0;
  const repeatClientRate = uniqueUsers > 0 ? Math.min(Math.round((repeatUsers / uniqueUsers) * 100), 100) : 0;
  
  const stats = isN8nAgent ? {
    price: agentPricing.pricePerExecution ? `$${agentPricing.pricePerExecution} per execution` : "Free",
    successRate: `${successRate}%`,
    avgDuration: agentStats.averageExecutionTime ? `${Math.round(Number(agentStats.averageExecutionTime))}ms` : "0ms",
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Agent Info & Key Stats */}
        <div className="lg:col-span-2">
          {/* Agent Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{agent.name}</h3>
                <p className="text-sm text-gray-500 font-mono">ID: {agent.id.slice(0, 8)}...</p>
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

          {/* Key Statistics - Clean Grid */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">Price</p>
              <p className="text-sm font-semibold text-gray-900">{stats.price}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">Success Rate</p>
              <p className="text-sm font-semibold text-green-700">{stats.successRate}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">Duration</p>
              <p className="text-sm font-semibold text-gray-900">{stats.avgDuration}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">Jobs Completed</p>
              <p className="text-sm font-semibold text-gray-900">{stats.jobsCompleted}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">Rating</p>
              <p className="text-sm font-semibold text-gray-900">⭐ {stats.avgRating}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">Repeat Rate</p>
              <p className="text-sm font-semibold text-gray-900">{stats.repeatClients}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">Failure Rate</p>
              <p className="text-sm font-semibold text-red-600">{stats.failureRate}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">Uptime</p>
              <p className="text-sm font-semibold text-green-700">{stats.uptime}</p>
            </div>
          </div>

          {/* Agent URL - Clean */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium mb-1">Run URL</p>
            <p className="text-xs font-mono text-gray-700 break-all">{agent.runUrl}</p>
          </div>
        </div>

        {/* Right Column - Action Buttons */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Actions</h4>
          <div className="grid grid-cols-1 gap-3">
            {actions.map((action) => (
              <button
                key={action.action}
                onClick={() => action.action === 'requirements' ? setShowRequirements(true) : handleAction(action.action)}
                disabled={loading}
                className={`px-4 py-3 rounded-lg text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${action.color} hover:shadow-md`}
                title={action.description}
              >
                {loading ? "Loading..." : action.name}
              </button>
            ))}
          </div>

          {/* Debug Log - Clean */}
          {localLog && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Debug Log</h4>
              <div className="bg-gray-900 text-green-400 rounded-lg p-3 overflow-auto max-h-32">
                <pre className="text-xs font-mono whitespace-pre-wrap">{localLog}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Requirements Modal */}
      <AgentRequirementsModal
        agentId={agent.id}
        isOpen={showRequirements}
        onClose={() => setShowRequirements(false)}
      />
    </div>
  );
}
