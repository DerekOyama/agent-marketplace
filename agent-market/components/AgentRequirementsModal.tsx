"use client";

import { useState, useEffect, useCallback } from "react";

interface AgentRequirements {
  agent: {
    id: string;
    name: string;
    description?: string;
    type: string;
    triggerType?: string;
    isActive: boolean;
    pricing?: Record<string, unknown>;
    stats?: Record<string, unknown>;
  };
  input: {
    schema: Record<string, unknown>;
    example: Record<string, unknown>;
    description: string;
    requiredFields: string[];
  };
  output: {
    schema: Record<string, unknown>;
    description: string;
    example: Record<string, unknown>;
  };
  usage: {
    endpoint: string;
    method: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
  };
}

interface AgentRequirementsModalProps {
  agentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentRequirementsModal({ 
  agentId, 
  isOpen, 
  onClose 
}: AgentRequirementsModalProps) {
  const [requirements, setRequirements] = useState<AgentRequirements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'output' | 'usage'>('input');

  const fetchRequirements = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/agents/${agentId}/requirements`);
      const data = await response.json();
      
      if (data.success) {
        setRequirements(data.documentation);
      } else {
        setError(data.error || 'Failed to fetch requirements');
      }
    } catch (err) {
      setError('Network error while fetching requirements');
      console.error('Error fetching requirements:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (isOpen && agentId) {
      fetchRequirements();
    }
  }, [isOpen, agentId, fetchRequirements]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {requirements?.agent.name || 'Agent Requirements'}
              </h2>
              {requirements?.agent.description && (
                <p className="text-white/90 mt-1">{requirements.agent.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-white/80 transition-colors text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-900 font-medium">Loading requirements...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="text-red-600 text-4xl mb-4">⚠️</div>
                <p className="text-red-700 mb-2 font-semibold">Error loading requirements</p>
                <p className="text-gray-900 text-sm">{error}</p>
                <button
                  onClick={fetchRequirements}
                  className="mt-4 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : requirements ? (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-300">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'input', label: 'Input Requirements', icon: '📥' },
                    { id: 'output', label: 'Output Format', icon: '📤' },
                    { id: 'usage', label: 'How to Use', icon: '🚀' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as 'input' | 'output' | 'usage')}
                      className={`py-4 px-2 border-b-2 font-semibold text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-amber-600 text-amber-700'
                          : 'border-transparent text-gray-800/70 hover:text-gray-900 hover:border-gray-400'
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'input' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Input Requirements
                      </h3>
                      <p className="text-gray-900 mb-4">{requirements.input.description}</p>
                      
                      {requirements.input.requiredFields.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Required Fields:</h4>
                          <div className="flex flex-wrap gap-2">
                            {requirements.input.requiredFields.map((field) => (
                              <span
                                key={field}
                                className="px-3 py-1 bg-red-200 text-red-900 rounded-full text-sm font-semibold"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Example Input:</h4>
                      <div className="bg-gray-900 text-green-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{JSON.stringify(requirements.input.example, null, 2)}</pre>
                      </div>
                    </div>

                    {requirements.input.schema && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Schema:</h4>
                        <div className="bg-white p-4 rounded-lg border border-gray-400">
                          <pre className="text-sm text-gray-900 overflow-x-auto">
                            {JSON.stringify(requirements.input.schema, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'output' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Output Format
                      </h3>
                      <p className="text-gray-900 mb-4">{requirements.output.description}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Example Output:</h4>
                      <div className="bg-gray-900 text-green-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{JSON.stringify(requirements.output.example, null, 2)}</pre>
                      </div>
                    </div>

                    {requirements.output.schema && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Schema:</h4>
                        <div className="bg-white p-4 rounded-lg border border-gray-400">
                          <pre className="text-sm text-gray-900 overflow-x-auto">
                            {JSON.stringify(requirements.output.schema, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'usage' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        How to Use This Agent
                      </h3>
                      <p className="text-gray-900 mb-4">
                        This agent is ready to use! Simply provide your input data and we&apos;ll handle the rest.
                      </p>
                    </div>

                    {/* Simple Usage Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">📋 Usage Instructions:</h4>
                      <ol className="text-blue-800 text-sm space-y-2 list-decimal list-inside">
                        <li>Prepare your input data in the format shown above</li>
                        <li>Send a POST request to our execution endpoint</li>
                        <li>Include your agent ID and input data in the request</li>
                        <li>Receive the processed results from the agent</li>
                      </ol>
                    </div>

                    {/* Example Request */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Example Request:</h4>
                      <div className="bg-gray-900 text-green-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{`curl -X POST \\
  https://agent-marketplace.com/api/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "${requirements.agent.id}",
    "data": ${JSON.stringify(requirements.usage.body.data, null, 2)}
  }'`}</pre>
                      </div>
                    </div>

                    {/* Response Example */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Example Response:</h4>
                      <div className="bg-gray-900 text-green-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{`{
  "success": true,
  "result": {
    "success": true,
    "data": {
      "message": "Processing completed successfully"
    },
    "metadata": {
      "executionId": "exec_123456789",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "duration": 1500
    }
  },
  "agent": {
    "id": "${requirements.agent.id}",
    "name": "${requirements.agent.name}"
  }
}`}</pre>
                      </div>
                    </div>

                    {/* Integration Note */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-semibold text-amber-900 mb-2">🔧 Integration Note:</h4>
                      <p className="text-amber-800 text-sm">
                        This agent is powered by our internal automation system. You don&apos;t need to worry about the technical details - 
                        just send your data and we&apos;ll handle calling the appropriate automation workflows.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
