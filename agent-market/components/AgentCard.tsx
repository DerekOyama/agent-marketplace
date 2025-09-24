"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  isHidden?: boolean;
  isDeleted?: boolean;
  metadata?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  inputRequirements?: string;
  pricePerExecutionCents?: number;
  exampleInput?: string;
  exampleOutput?: string;
}

interface AgentCardProps {
  agent: Agent;
  onAction: (action: string, agentId: string) => Promise<void>;
  loading: boolean;
  log: string;
  debugEnabled?: boolean;
}

export default function AgentCard({ agent, onAction, loading, log, debugEnabled = false }: AgentCardProps) {
  const router = useRouter();
  const [localLog, setLocalLog] = useState<string>("");
  const [showRequirements, setShowRequirements] = useState(false);
  const [showHideConfirm, setShowHideConfirm] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [showPriceEdit, setShowPriceEdit] = useState(false);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState<string>(((agent.pricePerExecutionCents || 0) / 100).toFixed(2));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAction = async (action: string) => {
    if (action === 'delete-agent') {
      setShowDeleteConfirm(true);
      return;
    }
    
    setLocalLog("");
    await onAction(action, agent.id);
    setLocalLog(log);
  };

  const handleToggleVisibility = async () => {
    setIsHiding(true);
    try {
      await onAction('toggle-visibility', agent.id);
    } finally {
      setIsHiding(false);
      setShowHideConfirm(false);
    }
  };

  const handlePriceUpdate = async () => {
    const priceInCents = Math.round(parseFloat(newPrice) * 100);
    if (isNaN(priceInCents) || priceInCents < 0) {
      alert('Please enter a valid price');
      return;
    }

    setIsUpdatingPrice(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/update-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pricePerExecutionCents: priceInCents }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Update the agent in the parent component
        await onAction('refresh-agent', agent.id);
        setShowPriceEdit(false);
      } else {
        alert(`Failed to update price: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error updating price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleDeleteAgent = async () => {
    // Check if confirmation text matches agent name
    if (deleteConfirmText !== agent.name) {
      alert(`Please type "${agent.name}" to confirm deletion`);
      return;
    }

    setIsDeleting(true);
    try {
      console.log('Attempting to delete agent:', agent.id, agent.name);
      const response = await fetch(`/api/agents/${agent.id}/delete`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status);
      const result = await response.json();
      console.log('Delete response data:', result);
      
      if (result.success) {
        // Refresh the agent list
        await onAction('refresh-agent', agent.id);
        // Reset confirmation state
        setShowDeleteConfirm(false);
        setDeleteConfirmText('');
      } else {
        alert(`Failed to delete agent: ${result.error || result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Error deleting agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const isN8nAgent = agent.type === 'n8n';
  
  const actions = isN8nAgent ? [
    // Execute button - disabled for deleted agents
    { 
      name: agent.isDeleted ? "Agent Deleted" : "Run Agent", 
      action: agent.isDeleted ? "" : "execute", 
      color: agent.isDeleted ? "bg-gray-400 cursor-not-allowed" : "bg-blue-700 hover:bg-blue-800",
      description: agent.isDeleted ? "This agent has been deleted" : "Run this agent with your input"
    },
    { 
      name: "View Requirements", 
      action: "requirements", 
      color: "bg-indigo-700 hover:bg-indigo-800",
      description: "View input/output requirements"
    },
    // Add debug mode buttons
    ...(debugEnabled ? [
      {
        name: agent.isHidden ? "Unhide Agent" : "Hide Agent",
        action: agent.isHidden ? "unhide" : "hide",
        color: agent.isHidden ? "bg-green-700 hover:bg-green-800" : "bg-red-700 hover:bg-red-800",
        description: agent.isHidden ? "Make agent visible to users" : "Hide agent from users"
      },
      {
        name: "Edit Price",
        action: "edit-price",
        color: "bg-purple-700 hover:bg-purple-800",
        description: "Edit the price per execution"
      },
      {
        name: "Delete Agent",
        action: "delete-agent",
        color: "bg-red-700 hover:bg-red-800",
        description: "Permanently delete this agent"
      }
    ] : [])
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
    },
    // Add debug mode buttons
    ...(debugEnabled ? [
      {
        name: agent.isHidden ? "Unhide Agent" : "Hide Agent",
        action: agent.isHidden ? "unhide" : "hide",
        color: agent.isHidden ? "bg-green-700 hover:bg-green-800" : "bg-red-700 hover:bg-red-800",
        description: agent.isHidden ? "Make agent visible to users" : "Hide agent from users"
      },
      {
        name: "Edit Price",
        action: "edit-price",
        color: "bg-purple-700 hover:bg-purple-800",
        description: "Edit the price per execution"
      }
    ] : [])
  ];

  // Get stats from agent data or use defaults
  const agentStats = agent.stats || {};
  
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
    price: agent.pricePerExecutionCents ? `$${(agent.pricePerExecutionCents / 100).toFixed(2)} per execution` : "Free",
    successRate: `${successRate}%`,
    avgDuration: agentStats.averageExecutionTime ? `${Math.round(Number(agentStats.averageExecutionTime))}ms` : "0ms",
    jobsCompleted: totalExecutions.toString(),
    avgRating: averageRating > 0 ? averageRating.toFixed(1) : "0.0",
    reviewCount: totalRatings.toString(),
    repeatClients: `${repeatClientRate}%`,
    failureRate: `${failureRate}%`,
    uptime: uptime
  } : {
    price: agent.pricePerExecutionCents ? `$${(agent.pricePerExecutionCents / 100).toFixed(2)} per execution` : "Free",
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
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column - Agent Info & Key Stats */}
        <div className="lg:col-span-3">
          {/* Agent Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{agent.name}</h3>
                  {agent.isHidden && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      👁️ Hidden
                    </span>
                  )}
                  {agent.isDeleted && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      🗑️ Deleted
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-mono">ID: {agent.id.slice(0, 8)}...</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-700 font-medium">Active</span>
            </div>
          </div>

          {/* Key Statistics - Aesthetic Pills */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" /></svg>
              {stats.price}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {stats.successRate} success
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>
              {stats.avgDuration}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>
              {stats.jobsCompleted} jobs
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.034a1 1 0 00-1.176 0l-2.802 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              ⭐ {stats.avgRating}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {stats.uptime} uptime
            </span>
          </div>

          {/* Agent Description */}
          {agent.description && (
            <div className="mb-3">
              <p className="text-sm text-gray-600 line-clamp-2">{agent.description}</p>
            </div>
          )}
        </div>

        {/* Right Column - Action Buttons */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Actions</h4>
          <div className="grid grid-cols-1 gap-2">
            {actions.map((action) => (
              <button
                key={action.action}
                onClick={() => {
                  if (action.action === 'requirements') {
                    setShowRequirements(true);
                  } else if (action.action === 'hide' || action.action === 'unhide') {
                    setShowHideConfirm(true);
                  } else if (action.action === 'edit-price') {
                    setShowPriceEdit(true);
                  } else if (action.action === 'execute') {
                    router.push(`/execute/${agent.id}`);
                  } else {
                    handleAction(action.action);
                  }
                }}
                disabled={loading}
                className={`px-3 py-2 rounded-lg text-white text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${action.color} hover:shadow-md`}
                title={action.description}
              >
                {loading ? "Loading..." : action.name}
              </button>
            ))}
          </div>

          {/* Debug Log - Compact */}
          {localLog && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-gray-900 mb-1">Debug Log</h4>
              <div className="bg-gray-900 text-green-400 rounded p-2 overflow-auto max-h-24">
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

      {/* Hide/Unhide Confirmation Form */}
      {showHideConfirm && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-blue-800">
                {agent.isHidden ? '👁️ Unhide Agent' : '🙈 Hide Agent'}
              </h4>
              <button
                onClick={() => setShowHideConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-blue-700">
              {agent.isHidden 
                ? `Are you sure you want to make "${agent.name}" visible to all users?`
                : `Are you sure you want to hide "${agent.name}" from users? It will no longer appear in the agent list.`
              }
            </p>
            
            <div className="flex space-x-2">
              <button
                onClick={handleToggleVisibility}
                disabled={isHiding}
                className={`px-3 py-2 text-white rounded-lg transition-colors text-sm font-medium ${
                  agent.isHidden 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isHiding ? 'Processing...' : (agent.isHidden ? 'Unhide' : 'Hide')}
              </button>
              <button
                onClick={() => setShowHideConfirm(false)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                disabled={isHiding}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Edit Form */}
      {showPriceEdit && (
        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-purple-800">💰 Edit Agent Price</h4>
              <button
                onClick={() => {
                  setShowPriceEdit(false);
                  setNewPrice(((agent.pricePerExecutionCents || 0) / 100).toFixed(2));
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-purple-700">
              Set the price per execution for <strong>&quot;{agent.name}&quot;</strong>
            </p>
            
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Price per execution (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-purple-600 mt-1">
                Current price: ${((agent.pricePerExecutionCents || 0) / 100).toFixed(2)}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handlePriceUpdate}
                disabled={isUpdatingPrice}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isUpdatingPrice ? 'Updating...' : 'Update Price'}
              </button>
              <button
                onClick={() => {
                  setShowPriceEdit(false);
                  setNewPrice(((agent.pricePerExecutionCents || 0) / 100).toFixed(2));
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Form */}
      {showDeleteConfirm && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-red-800">⚠️ Delete Agent</h4>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-red-700">
              This will permanently delete <strong>&quot;{agent.name}&quot;</strong> and all associated data. This action cannot be undone.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-red-700 mb-1">
                Type the agent name to confirm deletion:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Type "${agent.name}" here`}
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-500 text-sm"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleDeleteAgent}
                disabled={isDeleting || deleteConfirmText !== agent.name}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isDeleting ? 'Deleting...' : 'Delete Agent'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
