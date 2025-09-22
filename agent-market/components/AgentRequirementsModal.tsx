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
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {requirements?.agent.name || 'Agent Requirements'}
              </h2>
              {requirements?.agent.description && (
                <p className="text-amber-100 mt-1">{requirements.agent.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-amber-200 transition-colors text-2xl"
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading requirements...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <p className="text-red-600 mb-2">Error loading requirements</p>
                <p className="text-gray-600 text-sm">{error}</p>
                <button
                  onClick={fetchRequirements}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : requirements ? (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'input', label: 'Input Requirements', icon: '📥' },
                    { id: 'output', label: 'Output Format', icon: '📤' },
                    { id: 'usage', label: 'Usage Examples', icon: '🚀' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as 'input' | 'output' | 'usage')}
                      className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-amber-500 text-amber-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Input Requirements
                      </h3>
                      <p className="text-gray-600 mb-4">{requirements.input.description}</p>
                      
                      {requirements.input.requiredFields.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Required Fields:</h4>
                          <div className="flex flex-wrap gap-2">
                            {requirements.input.requiredFields.map((field) => (
                              <span
                                key={field}
                                className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Example Input:</h4>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{JSON.stringify(requirements.input.example, null, 2)}</pre>
                      </div>
                    </div>

                    {requirements.input.schema && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Schema:</h4>
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <pre className="text-sm overflow-x-auto">
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Output Format
                      </h3>
                      <p className="text-gray-600 mb-4">{requirements.output.description}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Example Output:</h4>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{JSON.stringify(requirements.output.example, null, 2)}</pre>
                      </div>
                    </div>

                    {requirements.output.schema && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Schema:</h4>
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <pre className="text-sm overflow-x-auto">
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Usage Examples
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Here&apos;s how to use this agent in your application:
                      </p>
                    </div>

                    <div className="grid gap-6">
                      {/* cURL Example */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">cURL Request:</h4>
                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                          <pre>{`curl -X ${requirements.usage.method} \\
  ${requirements.usage.endpoint} \\
  -H "Content-Type: ${requirements.usage.headers['Content-Type']}" \\
  -d '${JSON.stringify(requirements.usage.body, null, 2)}'`}</pre>
                        </div>
                      </div>

                      {/* JavaScript Example */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">JavaScript:</h4>
                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                          <pre>{`const response = await fetch('${requirements.usage.endpoint}', {
  method: '${requirements.usage.method}',
  headers: {
    'Content-Type': '${requirements.usage.headers['Content-Type']}'
  },
  body: JSON.stringify(${JSON.stringify(requirements.usage.body, null, 2)})
});

const result = await response.json();
console.log(result);`}</pre>
                        </div>
                      </div>

                      {/* Python Example */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Python:</h4>
                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                          <pre>{`import requests
import json

response = requests.${requirements.usage.method.toLowerCase()}(
    '${requirements.usage.endpoint}',
    headers={'Content-Type': '${requirements.usage.headers['Content-Type']}'},
    data=json.dumps(${JSON.stringify(requirements.usage.body, null, 2)})
)

result = response.json()
print(result)`}</pre>
                        </div>
                      </div>
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
