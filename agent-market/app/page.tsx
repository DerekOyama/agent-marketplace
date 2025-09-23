"use client";

import { useState, useEffect, useCallback } from "react";
import AgentCard from "../components/AgentCard";
import CreditBalance from "../components/CreditBalance";
import CreditPurchase from "../components/CreditPurchase";
import CreditHistory from "../components/CreditHistory";
import StripePaymentTest from "../components/StripePaymentTest";
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
  metadata?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export default function Home() {
  const [log, setLog] = useState<string>("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setCreditBalance] = useState<number>(0);
  const [creditRefreshTrigger, setCreditRefreshTrigger] = useState<number>(0);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [showStripeTest, setShowStripeTest] = useState(false);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);
  const [showCreditHistory, setShowCreditHistory] = useState(false);

  // Fetch agents from the database
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
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
        // Fetch real-time stats for each agent
        const agentsWithStats = await Promise.all(
          data.agents.map(async (agent) => {
            try {
              const statsRes = await fetch(`/api/agents/${agent.id}/stats`);
              if (statsRes.ok) {
                const statsData = await statsRes.json();
                return {
                  ...agent,
                  stats: statsData.stats
                };
              }
            } catch (error) {
              console.warn(`Failed to fetch stats for agent ${agent.id}:`, error);
            }
            return agent;
          })
        );
        setAgents(agentsWithStats);
      } else {
        setLog("No agents found. Please run the seed script first.");
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      setLog("Error fetching agents: " + (error instanceof Error ? error.message : String(error)));
    }
  }, []);

  useEffect(() => {
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

  // Real-time metrics refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAgents();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchAgents]);

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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Agent Marketplace</h1>
              <p className="mt-2 text-gray-600">
                Manage and test your AI agents with professional debugging tools
              </p>
            </div>
            
            {/* Top Navigation */}
            <div className="flex items-center space-x-4">
              <CreditBalance 
                onBalanceUpdate={setCreditBalance}
                refreshTrigger={creditRefreshTrigger}
              />
              <Link 
                href="/n8n" 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Connect N8n
              </Link>
              <button
                onClick={() => setShowCreditPurchase(!showCreditPurchase)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                {showCreditPurchase ? "Hide Purchase" : "Buy Credits"}
              </button>
              <button
                onClick={() => setShowCreditHistory(!showCreditHistory)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
              >
                {showCreditHistory ? "Hide History" : "Credit History"}
              </button>
              <button
                onClick={() => setShowStripeTest(!showStripeTest)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
              >
                {showStripeTest ? "Hide Stripe Test" : "Stripe Test"}
              </button>
              <button
                onClick={() => setShowDebugMenu(!showDebugMenu)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
              >
                {showDebugMenu ? "Hide Debug" : "Debug"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Credit Purchase */}
        {showCreditPurchase && (
          <div className="mb-8">
            <CreditPurchase 
              onPurchaseComplete={() => setCreditRefreshTrigger(prev => prev + 1)}
              onBalanceUpdate={() => setCreditRefreshTrigger(prev => prev + 1)}
            />
          </div>
        )}

        {/* Credit History */}
        {showCreditHistory && (
          <div className="mb-8">
            <CreditHistory refreshTrigger={creditRefreshTrigger} />
          </div>
        )}

        {/* Stripe Payment Test */}
        {showStripeTest && (
          <div className="mb-8">
            <StripePaymentTest />
          </div>
        )}

        {/* Debug Menu */}
        {showDebugMenu && (
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Debug Controls</h3>
              
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
        <div className="space-y-6">
          {agents.length > 0 ? (
            agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onAction={(action) => handleAgentAction(action, agent.id)}
                loading={loading}
                log={log}
              />
            ))
          ) : (
            <div className="text-center py-16">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Agents Found</h3>
                <p className="text-gray-600 mb-8">
                  Get started by creating your first AI agent or connecting n8n workflows.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => handleAgentAction("seed", "")}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {loading ? "Loading..." : "Create Test Agent"}
                  </button>
                  <Link 
                    href="/n8n" 
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors text-center"
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
    </main>
  );
}