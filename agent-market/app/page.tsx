"use client";

import { useState, useEffect, useCallback } from "react";
import AgentCard from "../components/AgentCard";
import CreditBalance from "../components/CreditBalance";
import AdminSidebar from "../components/AdminSidebar";
import { useAdmin } from "../lib/use-admin";
import Link from "next/link";

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
  pricePerExecutionCents?: number;
  metadata?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export default function Home() {
  const { isAdmin } = useAdmin();
  const [log, setLog] = useState<string>("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setCreditBalance] = useState<number>(0);
  const [creditRefreshTrigger, setCreditRefreshTrigger] = useState<number>(0);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [showAdminSidebar, setShowAdminSidebar] = useState(false);

  // Fetch agents from the database
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      // Fast path: load light list first (no heavy stats)
      const debugParam = isAdmin ? "&debug=true" : "";
      const res = await fetch(`/api/agents?mode=light${debugParam}`);
      const text = await res.text();
      let data: { agents?: Agent[] } = {};
      
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        setLog("Error: Invalid JSON response from /api/agents");
        return;
      }
      
      if (data.agents && data.agents.length > 0) {
        // Show light list immediately
        setAgents(data.agents);
        try { localStorage.setItem("agentsCache", JSON.stringify(data.agents)); } catch {}

        // Background upgrade to full stats without blocking UI
        try {
          const fullRes = await fetch(`/api/agents?mode=full${debugParam}`);
          if (fullRes.ok) {
            const fullText = await fullRes.text();
            const fullData = fullText ? JSON.parse(fullText) : {};
            if (fullData.agents) {
              setAgents(fullData.agents);
              try { localStorage.setItem("agentsCache", JSON.stringify(fullData.agents)); } catch {}
            }
          }
        } catch {}
      } else {
        setAgents([]);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      setLog("Error fetching agents: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    // Hydrate from cache for fast first paint
    try {
      const cached = localStorage.getItem("agentsCache");
      if (cached) {
        const parsed = JSON.parse(cached) as Agent[];
        if (Array.isArray(parsed)) {
          setAgents(parsed);
        }
      }
    } catch {}
    fetchAgents();
    
    // Listen for messages from credit purchase popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CREDIT_PURCHASE_COMPLETE') {
        console.log('Credit purchase completed, refreshing balance and history');
        setCreditRefreshTrigger(prev => prev + 1);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchAgents]);



  // Removed auto-refresh - users must manually refresh page to update agents

  async function post(url: string, body?: Record<string, unknown>) {
    setLoading(true);
    try {
      console.log(`Making POST request to: ${url}`, body);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      console.log(`Response status: ${res.status}`);
      let data = {};
      let text = "";
      try {
        text = await res.text();
        console.log(`Response text:`, text);
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        data = { error: "Invalid JSON response", rawResponse: text };
      }
      
      const logData = { 
        url, 
        status: res.status, 
        request: body, 
        response: data,
        timestamp: new Date().toISOString()
      };
      setLog(JSON.stringify(logData, null, 2));
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function handleAgentAction(action: string, agentId: string) {
    console.log(`Agent action: ${action} for agent: ${agentId}`);
    
    try {
      switch (action) {
        case "seed":
          await post("/api/agents", {
            name: "Test Agent",
            description: "A test agent for development",
            runUrl: "https://example.com/run",
            quoteUrl: "https://example.com/quote"
          });
          await fetchAgents();
          break;
        case "credits":
          await post("/api/credits");
          break;
        case "mandate":
          await post("/api/mandates", { rules: { max_amount_cents: 2000 } });
          break;
        case "transaction":
          await post("/api/transactions", { agentId, amountCents: 500 });
          break;
        case "dispatch":
          const tx = await post("/api/transactions", { agentId, amountCents: 500 }) as { transaction?: { id: string } };
          if (tx?.transaction?.id) {
            await post(`/api/transactions/${tx.transaction.id}/dispatch`);
          }
          break;
        case "receipt":
          const receiptTx = await post("/api/transactions", { agentId, amountCents: 500 }) as { transaction?: { id: string } };
          const id = receiptTx?.transaction?.id;
          if (id) {
            await post(`/api/transactions/${id}/receipt`, {
              transaction_id: id,
              status: "success",
              output: { ok: true },
            });
          }
          break;
        case "stripe-test-payment":
          await post("/api/stripe/test-payment", { 
            amountCents: 1000, 
            currency: "usd",
            description: "Test payment for Agent Marketplace"
          });
          break;
        case "stripe-test-webhook":
          await post("/api/stripe/test-webhook");
          break;
        case "stripe-checkout":
          await post("/api/stripe/checkout-session", { 
            amountCents: 2000, 
            currency: "usd",
            description: "Agent Marketplace Credits",
            successUrl: "http://localhost:3000?payment=success",
            cancelUrl: "http://localhost:3000?payment=cancelled"
          });
          break;
        case "stripe-status":
          await post("/api/stripe/status");
          break;
        case "execute":
          const executeResult = await post("/api/n8n/execute", { 
            agentId, 
            inputData: { 
              test: true, 
              text: "Greetings from your first AI agent! This is a test execution from the Agent Marketplace.",
              message: "Hello, I'm your first automated agent ready to help with tasks!",
              agentType: "n8n-webhook-agent",
              status: "active"
            } 
          }) as { 
            success?: boolean; 
            status?: number; 
            data?: { code?: number; message?: string }; 
            agentId?: string; 
            webhookUrl?: string; 
            creditsDeducted?: number;
            remainingCredits?: number;
            usage?: {
              creditsConsumed?: number;
              remainingCredits?: number;
              executionCostCents?: number;
              httpStatus?: number;
              httpStatusText?: string;
            };
            error?: string;
            message?: string;
            requiredCredits?: number;
            availableCredits?: number;
            details?: unknown;
          };
          
          if (executeResult?.success) {
            // Success case - show execution result with credit info
            setLog(JSON.stringify({
              status: "✅ Workflow executed successfully",
              statusCode: executeResult.status,
              response: executeResult.data,
              agentId: executeResult.agentId,
              webhookUrl: executeResult.webhookUrl,
              creditsDeducted: executeResult.usage?.creditsConsumed ? `$${(executeResult.usage.creditsConsumed / 100).toFixed(2)}` : "$0.00",
              remainingCredits: executeResult.usage?.remainingCredits ? `$${(executeResult.usage.remainingCredits / 100).toFixed(2)}` : "$0.00",
              timestamp: new Date().toISOString()
            }, null, 2));

          } else if (executeResult?.error === "insufficient_credits") {
            // Insufficient credits case
            setLog(JSON.stringify({
              status: "❌ Insufficient Credits",
              error: executeResult.error,
              message: executeResult.message,
              requiredCredits: executeResult.requiredCredits ? `$${(executeResult.requiredCredits / 100).toFixed(2)}` : "$0.50",
              availableCredits: executeResult.availableCredits ? `$${(executeResult.availableCredits / 100).toFixed(2)}` : "$0.00",
              agentId: executeResult?.agentId,
              timestamp: new Date().toISOString()
            }, null, 2));

          } else if (executeResult?.data?.code === 404 && executeResult?.data?.message?.includes("webhook")) {
            // Webhook needs activation
            setLog(JSON.stringify({
              ...executeResult,
              status: "⚠️ Webhook activation needed",
              note: "The n8n workflow webhook needs to be activated first"
            }, null, 2));
            
          } else {
            // General failure case
            setLog(JSON.stringify({
              status: "❌ Workflow execution failed",
              error: executeResult?.error || "Unknown error",
              details: executeResult?.details || executeResult?.data,
              agentId: executeResult?.agentId,
              timestamp: new Date().toISOString()
            }, null, 2));
          }

          // Update the agent's stats in the UI after successful execution
          if (executeResult?.success) {
            setCreditRefreshTrigger(prev => prev + 1);
            
            // Refresh real-time stats from the database
            setTimeout(() => {
              fetchAgents();
            }, 1000); // Wait 1 second for database updates to complete
          }
          break;
        case "toggle-visibility":
          const toggleResult = await post(`/api/agents/${agentId}/toggle-visibility`, {}) as { 
            success?: boolean; 
            message?: string;
            agent?: { id: string; name: string; isHidden: boolean };
          };
          if (toggleResult?.success) {
            setLog(`✅ ${toggleResult.message}`);
            // Update the specific agent in the list instead of refreshing all
            setAgents(prevAgents => 
              prevAgents.map(agent => 
                agent.id === agentId 
                  ? { ...agent, isHidden: toggleResult.agent?.isHidden ?? !agent.isHidden }
                  : agent
              )
            );
          } else {
            setLog(`❌ Failed to toggle visibility: ${toggleResult?.message || 'Unknown error'}`);
          }
          break;
        case "refresh-agent":
          // Refresh a specific agent by refetching all agents
          await fetchAgents();
          setLog(`✅ Agent ${agentId} refreshed`);
          break;
        default:
          setLog(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      setLog(`Error in ${action}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-4xl font-bold mb-2">AI Agent Marketplace</h1>
              <p className="text-blue-100 text-lg">
                Discover, purchase, and execute AI agents for your business needs
              </p>
              <div className="mt-3 flex items-center space-x-4 text-sm text-blue-200">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Ready-to-use agents
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Pay per execution
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Easy integration
                </span>
              </div>
            </div>
            
            {/* Top Navigation - Sign In & Wallet */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <CreditBalance 
                onBalanceUpdate={setCreditBalance}
                refreshTrigger={creditRefreshTrigger}
              />
              <Link
                href="/funds"
                className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm flex items-center space-x-2 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m0-4h4m-4 0l-2-2m2 2l-2 2" />
                </svg>
                <span>View Wallet</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* N8N Integration Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-center">
            <Link
              href="/n8n"
              className="inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 font-medium text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Connect N8N Workflows</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Sidebar - Only visible to admins */}
      {isAdmin && (
        <AdminSidebar 
          isOpen={showAdminSidebar}
          onClose={() => setShowAdminSidebar(false)}
        />
      )}

      <div className={`transition-all duration-300 ${
        showAdminSidebar ? 'mr-0' : 'mr-0'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Debug Menu - Only visible to admins */}
        {isAdmin && showDebugMenu && (
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Admin Debug Controls</h3>
                <button
                  onClick={() => setShowDebugMenu(false)}
                  className="px-3 py-1 bg-gray-900 text-white rounded hover:bg-black transition-colors text-sm"
                  title="Hide debug controls"
                >
                  Esc
                </button>
              </div>
              
              {/* Admin Debug Controls */}
                  
                  {/* Basic Controls */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-3">Basic Operations</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleAgentAction("seed", "")}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    {loading ? "Loading..." : "Seed Agent"}
                  </button>
                  <button
                    onClick={() => handleAgentAction("credits", "")}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Check Credits
                  </button>
                  <button
                    onClick={() => handleAgentAction("mandate", "")}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Create Mandate
                  </button>
                  <button
                    onClick={() => fetchAgents()}
                    disabled={loading}
                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Refresh Agents
                  </button>
                </div>
              </div>

              {/* N8n Testing - Removed per request */}

              {/* Stripe Payment Testing */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3">Stripe Payment Testing</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleAgentAction("stripe-status", "")}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Stripe Status
                  </button>
                  <button
                    onClick={() => handleAgentAction("stripe-test-payment", "")}
                    disabled={loading}
                    className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Test Payment
                  </button>
                  <button
                    onClick={() => handleAgentAction("stripe-test-webhook", "")}
                    disabled={loading}
                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Test Webhook
                  </button>
                  <button
                    onClick={() => handleAgentAction("stripe-checkout", "")}
                    disabled={loading}
                    className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Checkout Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agents List */}
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {Array.from({ length: Math.max(agents.length || 4, 4) }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                    <div>
                      <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="w-8 h-2 bg-gray-200 rounded" />
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Array.from({ length: 6 }).map((__, i) => (
                    <span key={i} className="h-6 w-20 bg-gray-200 rounded-full" />
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="h-8 bg-gray-200 rounded" />
                  <div className="h-8 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {!loading && agents.length > 0 ? (
            agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onAction={(action) => handleAgentAction(action, agent.id)}
                loading={loading}
                log={log}
                debugEnabled={isAdmin}
              />
            ))
          ) : (
            !loading && <div className="col-span-full text-center py-16">
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-12 max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to the AI Agent Marketplace</h3>
                <p className="text-gray-600 mb-8 text-lg">
                  Discover powerful AI agents ready to execute your business tasks. 
                  Browse our collection of pre-built agents or create your own custom solutions.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => handleAgentAction("seed", "")}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-400 transition-all duration-200 font-medium shadow-lg"
                  >
                    {loading ? "Loading..." : "Create Test Agent"}
                  </button>
                  <Link 
                    href="/n8n" 
                    className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-gray-300 shadow-sm text-center"
                  >
                    Connect N8n Workflows
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Log Output */}
        {log && (
          <div className="mt-8">
            <div className="bg-gray-900 text-green-400 rounded-lg border border-gray-700 overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">API Response Log</h3>
                <button
                  onClick={() => setLog("")}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Log
                </button>
              </div>
              <div className="p-4">
                <pre className="whitespace-pre-wrap break-words leading-relaxed font-mono text-sm overflow-x-auto">{log}</pre>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </main>
  );
}