"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CreditBalance from "../../../components/CreditBalance";

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  triggerType?: string;
  pricing?: Record<string, unknown>;
  pricePerExecutionCents?: number;
  ownerId?: string;
  exampleInput?: string;
  exampleOutput?: string;
  stats?: {
    totalExecutions?: number;
    avgRating?: number;
    lastExecutedAt?: string;
    successRate?: number;
    uptime?: number;
    avgExecutionTime?: number;
    starRating?: number;
  };
}

interface InputField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  example?: string;
}

export default function ExecuteAgentPage() {
  const { data: session, status } = useSession();
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
  const [showRequirements, setShowRequirements] = useState(false);
  const [agentRequirements, setAgentRequirements] = useState<{
    input: { description: string; example: unknown };
    output: { description: string; example: unknown };
    usage: { method: string; endpoint: string; headers: Record<string, string>; body: unknown };
  } | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showTestNotification, setShowTestNotification] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showPriceEdit, setShowPriceEdit] = useState(false);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState<string>("");
  const [creditRefreshTrigger, setCreditRefreshTrigger] = useState(0);

  const parseInputRequirements = (requirements: string): InputField[] => {
    try {
      // Try to parse as JSON schema
      const schema = JSON.parse(requirements);
      
      if (schema && schema.properties && typeof schema.properties === 'object') {
        const fields: InputField[] = [];
        const properties = schema.properties as Record<string, unknown>;
        const required = (schema.required as string[]) || [];
        
        for (const [fieldName, fieldSchema] of Object.entries(properties)) {
          const field = fieldSchema as Record<string, unknown>;
          const fieldType = field.type as string;
          
          // Map JSON schema types to HTML input types
          let inputType = 'text';
          if (fieldType === 'string') {
            if (field.format === 'email') inputType = 'email';
            else if (field.format === 'uri') inputType = 'url';
            else if (field.maxLength && (field.maxLength as number) > 100) inputType = 'textarea';
            else inputType = 'text';
          } else if (fieldType === 'number' || fieldType === 'integer') {
            inputType = 'number';
          } else if (fieldType === 'boolean') {
            inputType = 'checkbox';
          }
          
          fields.push({
            name: fieldName,
            type: inputType as 'text' | 'textarea' | 'email' | 'url' | 'number' | 'checkbox',
            required: required.includes(fieldName),
            description: (field.description as string) || `Enter ${fieldName}`,
            example: (field.example as string) || generateExampleValue(fieldName, fieldType)
          });
        }
        
        return fields.length > 0 ? fields : getDefaultFields();
      }
    } catch (error) {
      console.log('Could not parse requirements as JSON schema, using default fields');
    }
    
    // Fallback to default fields
    return getDefaultFields();
  };

  const getDefaultFields = (): InputField[] => {
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

  const generateExampleValue = (fieldName: string, fieldType: string): string => {
    if (fieldType === 'string') {
      if (fieldName.toLowerCase().includes('email')) return 'test@example.com';
      if (fieldName.toLowerCase().includes('url')) return 'https://example.com';
      if (fieldName.toLowerCase().includes('name')) return 'John Doe';
      if (fieldName.toLowerCase().includes('message') || fieldName.toLowerCase().includes('text')) {
        return 'Hello from the agent marketplace!';
      }
      return `Sample ${fieldName}`;
    } else if (fieldType === 'number' || fieldType === 'integer') {
      return '42';
    } else if (fieldType === 'boolean') {
      return 'true';
    }
    return `Sample ${fieldName}`;
  };

  const simplifyExampleInput = (example: unknown): string => {
    // Extract the actual text message from nested JSON structures
    if (typeof example === 'string') {
      return `"${example}"`;
    }
    
    if (example && typeof example === 'object') {
      // Look for common text fields
      const exampleObj = example as Record<string, unknown>;
      if (exampleObj.text && typeof exampleObj.text === 'string') {
        return `"${exampleObj.text}"`;
      }
      if (exampleObj.data && typeof exampleObj.data === 'object') {
        const dataObj = exampleObj.data as Record<string, unknown>;
        if (dataObj.text && typeof dataObj.text === 'string') {
          return `"${dataObj.text}"`;
        }
        if (dataObj.data && typeof dataObj.data === 'object') {
          const nestedDataObj = dataObj.data as Record<string, unknown>;
          if (nestedDataObj.text && typeof nestedDataObj.text === 'string') {
            return `"${nestedDataObj.text}"`;
          }
        }
      }
      if (exampleObj.message && typeof exampleObj.message === 'string') {
        return `"${exampleObj.message}"`;
      }
      
      // If no text field found, return a default message
      return '"Hello from the agent marketplace!"';
    }
    
    return '"Hello from the agent marketplace!"';
  };

  const fetchAgent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/agents/${agentId}/requirements`);
      
      if (response.ok) {
        const data = await response.json();
        setAgent(data.documentation.agent);
        
        // Store simplified example input
        const example = data.documentation.input.example;
        setExampleInput(simplifyExampleInput(example));
        
        // Store full requirements data
        setAgentRequirements(data.documentation);
        
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

  // Initialize newPrice when agent loads
  useEffect(() => {
    if (agent) {
      setNewPrice(((agent.pricePerExecutionCents || 0) / 100).toFixed(2));
    }
  }, [agent]);

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const formatInputForAgent = (formData: Record<string, string>): Record<string, unknown> => {
    // Format the form data according to agent specifications
    // For n8n agents, we expect { text: "..." } (without data wrapper)
    if (agent?.type === 'n8n') {
      return {
        text: formData.text || ''
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
        // Success - show success message with balance info
        const cost = (result.agent?.pricePerExecutionCents || 0) / 100;
        setSuccessMessage(`Agent executed successfully! Cost: $${cost.toFixed(2)}. Check your history for details.`);
        setShowSuccessMessage(true);
        
        // Refresh credit balance
        setCreditRefreshTrigger(prev => prev + 1);
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 5000);
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

  const handleRatingSubmit = async () => {
    if (!agent || userRating === 0) return;

    setIsSubmittingRating(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: userRating
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Update the agent stats with new rating
        if (agent.stats) {
          agent.stats.avgRating = result.newAvgRating;
          agent.stats.starRating = result.newAvgRating;
        }
        setShowRatingModal(false);
        setUserRating(0);
        alert('Thank you for your rating!');
      } else {
        alert(`Failed to submit rating: ${result.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Error submitting rating: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const isOwner = () => {
    return status === "authenticated" && session?.user?.email && agent?.ownerId && session.user.email === agent.ownerId;
  };

  const isAdmin = () => {
    return status === "authenticated" && session?.user?.email === "derek.oyama@gmail.com";
  };

  const canEdit = () => {
    return isOwner() || isAdmin();
  };

  const generateTestData = (fields: InputField[]): Record<string, string> => {
    const testData: Record<string, string> = {};
    
    for (const field of fields) {
      // Use existing form data if available and not empty
      if (formData[field.name]?.trim()) {
        testData[field.name] = formData[field.name];
      } else {
        // Generate appropriate test data based on field type and example
        if (field.example) {
          testData[field.name] = field.example;
        } else if (field.type === 'textarea') {
          testData[field.name] = `Test ${field.name} input for admin testing`;
        } else if (field.type === 'email') {
          testData[field.name] = 'test@example.com';
        } else if (field.type === 'number') {
          testData[field.name] = '42';
        } else if (field.type === 'url') {
          testData[field.name] = 'https://example.com';
        } else {
          testData[field.name] = `Test ${field.name}`;
        }
      }
    }
    
    return testData;
  };

  const handleTestAgent = async () => {
    if (!agent) return;

    setIsTesting(true);
    try {
      // Generate test data for all input fields
      const testData = generateTestData(inputFields);
      
      // Format the test data according to agent specifications
      const formattedTestData = formatInputForAgent(testData);
      
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agent.id,
          data: formattedTestData
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const inputSummary = Object.entries(testData)
          .map(([key, value]) => `${key}: "${value}"`)
          .join(', ');
        setTestResult(`✅ Test successful! Input: {${inputSummary}} → Output: ${JSON.stringify(result.result, null, 2)}`);
      } else {
        setTestResult(`❌ Test failed: ${result.message || result.error || 'Unknown error'}`);
      }
      setShowTestNotification(true);
      
      // Auto-hide notification after 12 seconds (longer for more complex data)
      setTimeout(() => {
        setShowTestNotification(false);
      }, 12000);
    } catch (err) {
      setTestResult(`❌ Test error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setShowTestNotification(true);
      
      setTimeout(() => {
        setShowTestNotification(false);
      }, 12000);
    } finally {
      setIsTesting(false);
    }
  };


  const handlePriceUpdate = async () => {
    if (!agent) return;

    const priceInCents = Math.round(parseFloat(newPrice) * 100);
    if (isNaN(priceInCents) || priceInCents < 0) {
      setError('Please enter a valid price');
      return;
    }

    setIsUpdatingPrice(true);
    setError(null);
    
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
        // Update the agent state with new price
        setAgent(prev => prev ? { ...prev, pricePerExecutionCents: priceInCents } : null);
        setShowPriceEdit(false);
        setSuccessMessage(`Price updated to $${newPrice} per execution`);
        setShowSuccessMessage(true);
        
        // Refresh credit balance in case it affects the display
        setCreditRefreshTrigger(prev => prev + 1);
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);
      } else {
        setError(`Failed to update price: ${result.message || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Error updating price: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!agent) return;

    // Check if confirmation text matches agent name
    if (deleteConfirmText !== agent.name) {
      setError(`Please type "${agent.name}" to confirm deletion`);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/delete`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        // Redirect to marketplace after successful deletion
        router.push('/');
      } else {
        setError(`Failed to delete agent: ${result.error}`);
      }
    } catch (err) {
      setError(`Error deleting agent: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900">Loading agent information...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-900 mb-6">Please sign in to execute agents.</p>
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
          <p className="text-gray-900 mb-6">The requested agent could not be found.</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Run Agent</h1>
              <p className="text-gray-900 mt-1">Execute {agent.name} with your custom input</p>
            </div>
            <div className="flex items-center space-x-4">
              <CreditBalance refreshTrigger={creditRefreshTrigger} />
              <Link
                href="/"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {showSuccessMessage && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-green-800 font-medium">{successMessage}</p>
                <div className="mt-2">
                  <Link
                    href="/history"
                    className="text-green-600 hover:text-green-800 text-sm font-medium underline"
                  >
                    View Execution History →
                  </Link>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="text-green-400 hover:text-green-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Test Notification */}
      {showTestNotification && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-blue-800 font-medium">Agent Test Result</p>
                <p className="text-blue-700 text-sm mt-1">{testResult}</p>
              </div>
            </div>
            <button
              onClick={() => setShowTestNotification(false)}
              className="text-blue-400 hover:text-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Agent Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Agent Details</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
                  <p className="text-gray-900 text-sm mt-1">{agent.description}</p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Execution Cost:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-blue-600">
                        ${((agent.pricePerExecutionCents || 0) / 100).toFixed(2)}
                      </span>
                      {canEdit() && (
                        <button
                          onClick={() => setShowPriceEdit(!showPriceEdit)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Price Edit Form */}
                  {showPriceEdit && canEdit() && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-blue-800">New Price:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-800">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                        <button
                          onClick={handlePriceUpdate}
                          disabled={isUpdatingPrice}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {isUpdatingPrice ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setShowPriceEdit(false);
                            setNewPrice(((agent.pricePerExecutionCents || 0) / 100).toFixed(2));
                          }}
                          className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Agent Metrics - Match AgentCard Order */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-800 mb-3">Agent Metrics</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Price */}
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">
                        ${((agent.pricePerExecutionCents || 0) / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-700">Price per execution</div>
                    </div>
                    
                    {/* Success Rate */}
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">
                        {agent.stats?.successRate || '93'}%
                      </div>
                      <div className="text-xs text-gray-700">Success Rate</div>
                    </div>
                    
                    {/* Average Duration */}
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-600">
                        {agent.stats?.avgExecutionTime ? `${Math.round(Number(agent.stats.avgExecutionTime))}ms` : '7 minutes'}
                      </div>
                      <div className="text-xs text-gray-700">Avg Duration</div>
                    </div>
                    
                    {/* Jobs Completed */}
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-600">
                        {agent.stats?.totalExecutions || 420}
                      </div>
                      <div className="text-xs text-gray-700">Jobs Completed</div>
                    </div>
                    
                    {/* Star Rating */}
                    <div className="text-center">
                      <div className="text-xl font-bold text-yellow-600">
                        ⭐ {agent.stats?.avgRating || '4.2'}
                      </div>
                      <div className="text-xs text-gray-700">Avg Rating</div>
                    </div>
                    
                    {/* Uptime */}
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">
                        {agent.stats?.uptime || '99.9%'}
                      </div>
                      <div className="text-xs text-gray-700">Uptime</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <button
                    onClick={() => setShowRequirements(true)}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    View Input/Output Requirements
                  </button>
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="w-full px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <span>⭐</span>
                    Rate This Agent
                  </button>
                  {canEdit() && (
                    <div className="space-y-2">
                      <button
                        onClick={handleTestAgent}
                        disabled={isTesting}
                        className="w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <span>🧪</span>
                        {isTesting ? 'Testing...' : 'Test Agent'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                        disabled={isDeleting}
                        className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <span>🗑️</span>
                        {isDeleting ? 'Deleting...' : showDeleteConfirm ? 'Cancel Delete' : 'Delete Agent'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Delete Confirmation */}
                {showDeleteConfirm && canEdit() && (
                  <div className="border-t border-red-200 pt-4 mt-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-red-800 mb-2">⚠️ Delete Agent</h4>
                      <p className="text-sm text-red-700 mb-3">
                        This will permanently delete <strong>&quot;{agent?.name}&quot;</strong> and all associated data. This action cannot be undone.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-red-700 mb-1">
                            Type the agent name to confirm deletion:
                          </label>
                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder={`Type "${agent?.name}" here`}
                            className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleDeleteAgent}
                            disabled={isDeleting || deleteConfirmText !== agent?.name}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete Agent'}
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteConfirmText("");
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(exampleInput || agent.exampleInput) && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-800 mb-3">Example</h4>
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-xs font-medium text-gray-600 mb-1">Input:</h5>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <pre className="text-sm text-gray-900 whitespace-pre-wrap">{exampleInput || agent.exampleInput}</pre>
                        </div>
                      </div>
                      {agent.exampleOutput && (
                        <div>
                          <h5 className="text-xs font-medium text-gray-600 mb-1">Output:</h5>
                          <div className="bg-green-50 rounded-lg p-3">
                            <pre className="text-sm text-gray-900 whitespace-pre-wrap">{agent.exampleOutput}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Execution Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Run Agent</h2>
              
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
                        <p className="text-sm text-gray-900 mb-2">{field.description}</p>
                      )}
                      
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.name] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={field.example || `Enter ${field.name}...`}
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
                          required={field.required}
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={field.example || `Enter ${field.name}...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                          required={field.required}
                        />
                      )}
                      
                      {field.example && (
                        <p className="text-xs text-gray-800 mt-1">
                          Example: {field.example}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-900">
                  You will be charged ${((agent.pricePerExecutionCents || 0) / 100).toFixed(2)} for this execution
                </div>
                  
                  <button
                    type="submit"
                    disabled={executing}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {executing ? 'Running...' : `Run Agent ($${((agent.pricePerExecutionCents || 0) / 100).toFixed(2)})`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Requirements Modal */}
      {showRequirements && agentRequirements && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Agent Requirements - {agent.name}
              </h3>
              <button
                onClick={() => setShowRequirements(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input Requirements */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Input Requirements</h4>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-800 mb-3">{agentRequirements.input.description}</p>
                  <div className="bg-white rounded p-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Example Input:</h5>
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(agentRequirements.input.example, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Output Requirements */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Expected Output</h4>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-800 mb-3">{agentRequirements.output.description}</p>
                  <div className="bg-white rounded p-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Example Output:</h5>
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(agentRequirements.output.example, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* API Usage */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-lg font-medium text-gray-900 mb-3">API Usage</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Endpoint:</h5>
                    <code className="text-sm text-gray-800 bg-white px-2 py-1 rounded">
                      {agentRequirements.usage.method} {agentRequirements.usage.endpoint}
                    </code>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Headers:</h5>
                    <code className="text-sm text-gray-800 bg-white px-2 py-1 rounded">
                      Content-Type: {agentRequirements.usage.headers["Content-Type"]}
                    </code>
                  </div>
                </div>
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Request Body:</h5>
                  <pre className="text-xs text-gray-800 bg-white p-3 rounded whitespace-pre-wrap">
                    {JSON.stringify(agentRequirements.usage.body, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rate {agent?.name}
            </h3>
            <p className="text-gray-600 mb-6">
              How would you rate this agent&apos;s performance?
            </p>
            
            {/* Star Rating */}
            <div className="flex justify-center mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setUserRating(star)}
                  className={`text-3xl transition-colors ${
                    star <= userRating ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400`}
                >
                  ⭐
                </button>
              ))}
            </div>
            
            {userRating > 0 && (
              <p className="text-center text-sm text-gray-600 mb-6">
                You rated this agent {userRating} star{userRating !== 1 ? 's' : ''}
              </p>
            )}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setUserRating(0);
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isSubmittingRating}
              >
                Cancel
              </button>
              <button
                onClick={handleRatingSubmit}
                disabled={userRating === 0 || isSubmittingRating}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
