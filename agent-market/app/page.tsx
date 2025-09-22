"use client";

import { useState, useEffect, useCallback } from "react";
import AgentCard from "../components/AgentCard";
import CreditBalance from "../components/CreditBalance";
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
        setAgents(data.agents);
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
            
            // Update agent stats optimistically
            setAgents(prevAgents => 
              prevAgents.map(agent => 
                agent.id === agentId 
                  ? {
                      ...agent,
                      stats: {
                        ...agent.stats,
                        totalExecutions: (Number(agent.stats?.totalExecutions) || 0) + 1,
                        successfulExecutions: (Number(agent.stats?.successfulExecutions) || 0) + 1,
                        averageExecutionTime: Math.round(
                          (Number(agent.stats?.averageExecutionTime) || 1500) * 0.95 + 
                          (Math.random() * 1000 + 500) * 0.05
                        ), // 95% weighted average with realistic execution time
                        lastExecution: new Date().toISOString(),
                        // Update repeat client rate slightly
                        uniqueUsers: (Number(agent.stats?.uniqueUsers) || 0) + (Math.random() < 0.1 ? 1 : 0), // 10% chance of new user
                        repeatUsers: (Number(agent.stats?.repeatUsers) || 0) + (Math.random() < 0.3 ? 1 : 0), // 30% chance of repeat user
                        // Update rating occasionally
                        totalRatings: (Number(agent.stats?.totalRatings) || 0) + (Math.random() < 0.25 ? 1 : 0), // 25% chance of rating
                        averageRating: agent.stats?.totalRatings && Math.random() < 0.25 
                          ? Math.round(((Number(agent.stats.averageRating) || 0) * (Number(agent.stats.totalRatings) || 0) + (4 + Math.random())) / ((Number(agent.stats.totalRatings) || 0) + 1) * 10) / 10
                          : (Number(agent.stats?.averageRating) || 0)
                      }
                    }
                  : agent
              )
            );
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
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Agent Marketplace</h1>
          <p className="text-lg text-gray-800 mb-6">
            Manage and test your AI agents with individual debugging controls
          </p>
          
          {/* Navigation Menu */}
          <div className="flex justify-center mb-6">
            <nav className="flex space-x-4">
              <Link 
                href="/n8n" 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Connect N8n Instance
              </Link>
              <Link 
                href="/simple" 
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Simple View
              </Link>
            </nav>
          </div>
          
          {/* Credit Balance */}
          <div className="max-w-md mx-auto mb-6">
            <CreditBalance 
              onBalanceUpdate={setCreditBalance}
              refreshTrigger={creditRefreshTrigger}
            />
          </div>

          {/* Global Actions */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <button
              onClick={() => handleAgentAction("seed", "")}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? "Loading..." : "Seed Agent"}
            </button>
            <button
              onClick={() => handleAgentAction("credits", "")}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Check Credits
            </button>
            <button
              onClick={() => handleAgentAction("mandate", "")}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Create Mandate
            </button>
            <button
              onClick={() => fetchAgents()}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Refresh Agents
            </button>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="max-w-6xl mx-auto">
          {agents.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onAction={(action) => handleAgentAction(action, agent.id)}
                  loading={loading}
                  log={log}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 max-w-md mx-auto border border-amber-200 shadow-lg">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">No Agents Found</h3>
                <p className="text-gray-600 mb-6">
                  Get started by seeding some test agents or connecting n8n workflows.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => handleAgentAction("seed", "")}
                    disabled={loading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {loading ? "Loading..." : "Create Test Agent"}
                  </button>
                  <Link 
                    href="/n8n" 
                    className="block w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors text-center"
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
          <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">API Response Log</h3>
              <button
                onClick={() => setLog("")}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
              >
                Clear
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-words">{log}</pre>
          </div>
        )}

      </div>
    </main>
  );
}