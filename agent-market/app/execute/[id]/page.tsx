"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  triggerType?: string;
  pricing?: { pricePerExecutionCents?: number };
  stats?: Record<string, unknown>;
}

interface InputField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  example?: string;
}

export default function ExecuteAgentPage() {
  const { status } = useSession();
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [inputFields, setInputFields] = useState<InputField[]>([]);
  const [exampleInput, setExampleInput] = useState<string>("");

  const parseInputRequirements = (_requirements: string): InputField[] => {
    // For now, we'll create a simple text field
    // Later this can be enhanced to parse complex JSON schemas
    return [
      {
        name: 'text',
        type: 'textarea',
        required: true,
        description: 'Enter the text input for the agent',
        example: 'Hello from the agent marketplace!'
      }
    ];
  };

  const fetchAgent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/agents/${agentId}/requirements`);
      
      if (response.ok) {
        const data = await response.json();
        setAgent(data.documentation.agent);
        
        // Store example input
        const example = data.documentation.input.example;
        setExampleInput(JSON.stringify(example, null, 2));
        
        // Parse input requirements to create form fields
        const fields = parseInputRequirements(data.documentation.input.description);
        setInputFields(fields);
        
        // Initialize form data with empty values
        const initialFormData: Record<string, string> = {};
        fields.forEach(field => {
          initialFormData[field.name] = '';
        });
        setFormData(initialFormData);
      } else {
        setError('Failed to fetch agent information');
      }
    } catch (err) {
      setError('Error fetching agent information');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (agentId && status === "authenticated") {
      fetchAgent();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [agentId, status, fetchAgent]);

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const formatInputForAgent = (formData: Record<string, string>): Record<string, unknown> => {
    // Format the form data according to agent specifications
    // For n8n agents, we typically expect { data: { text: "..." } }
    if (agent?.type === 'n8n') {
      return {
        data: {
          text: formData.text || ''
        }
      };
    }
    
    // For other agent types, return the form data as-is
    return formData;
  };

  const handleExecute = async () => {
    if (!agent) return;

    // Validate required fields
    const missingFields = inputFields
      .filter(field => field.required && !formData[field.name]?.trim())
      .map(field => field.name);

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      const formattedInput = formatInputForAgent(formData);
      
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agent.id,
          data: formattedInput
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Success - redirect to history or show success message
        const viewHistory = confirm('Agent executed successfully! Would you like to view your execution history?');
        if (viewHistory) {
          router.push('/history');
        } else {
          router.push('/');
        }
      } else {
        // Handle different error types
        if (result.error === 'insufficient_credits') {
          setError(`Insufficient credits. Required: $${(result.requiredCredits / 100).toFixed(2)}, Available: $${(result.availableCredits / 100).toFixed(2)}`);
        } else {
          setError(`Execution failed: ${result.message || result.error || 'Unknown error'}`);
        }
      }
    } catch (err) {
      setError(`Error executing agent: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setExecuting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agent information...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to execute agents.</p>
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

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Agent Not Found</h1>
          <p className="text-gray-600 mb-6">The requested agent could not be found.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Marketplace
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
              <h1 className="text-3xl font-bold text-gray-900">Execute Agent</h1>
              <p className="text-gray-600 mt-1">Run {agent.name} with your custom input</p>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Agent Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Agent Details</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{agent.description}</p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Execution Cost:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${((agent.pricing?.pricePerExecutionCents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {exampleInput && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Example Input</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap">{exampleInput}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Execution Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Provide Input</h2>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleExecute(); }}>
                <div className="space-y-6">
                  {inputFields.map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {field.description && (
                        <p className="text-sm text-gray-600 mb-2">{field.description}</p>
                      )}
                      
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.name] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={field.example || `Enter ${field.name}...`}
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          required={field.required}
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={field.example || `Enter ${field.name}...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required={field.required}
                        />
                      )}
                      
                      {field.example && (
                        <p className="text-xs text-gray-500 mt-1">
                          Example: {field.example}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    You will be charged ${((agent.pricing?.pricePerExecutionCents || 0) / 100).toFixed(2)} for this execution
                  </div>
                  
                  <button
                    type="submit"
                    disabled={executing}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {executing ? 'Executing...' : `Execute Agent ($${((agent.pricing?.pricePerExecutionCents || 0) / 100).toFixed(2)})`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
