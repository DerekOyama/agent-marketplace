"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [log, setLog] = useState<string>("");
  const [agentId, setAgentId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Fetch the first agent from the database
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await fetch("/api/agents");
        const text = await res.text();
        let data = {};
        
        try {
          data = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          setLog("Error: Invalid JSON response from /api/agents");
          return;
        }
        
        if (data.agents && data.agents.length > 0) {
          setAgentId(data.agents[0].id);
        } else {
          setLog("No agents found. Please run the seed script first.");
        }
      } catch (error) {
        console.error("Failed to fetch agent:", error);
        setLog(`Error fetching agents: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    fetchAgent();
  }, []);

  async function post(url: string, body?: any) {
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
      try {
        const text = await res.text();
        console.log(`Response text:`, text);
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        data = { error: "Invalid JSON response", rawResponse: text };
      }
      
      const logData = { 
        url, 
        status: res.status, 
        statusText: res.statusText,
        data,
        timestamp: new Date().toISOString()
      };
      setLog(JSON.stringify(logData, null, 2));
      return data;
    } catch (error) {
      console.error("Network error:", error);
      const errorData = { 
        error: "Network error", 
        message: error instanceof Error ? error.message : String(error),
        url,
        timestamp: new Date().toISOString()
      };
      setLog(JSON.stringify({ url, status: 0, data: errorData }, null, 2));
      return errorData;
    } finally {
      setLoading(false);
    }
  }

  const createMandate = () =>
    post("/api/mandates", { rules: { max_amount_cents: 2000 } });

  const createTx = () => {
    if (!agentId) {
      setLog("Error: No agent available. Please seed the database first.");
      return;
    }
    post("/api/transactions", { agentId, amountCents: 500 });
  };

  const dispatchTx = async () => {
    if (!agentId) {
      setLog("Error: No agent available. Please seed the database first.");
      return;
    }
    const tx = await post("/api/transactions", {
      agentId,
      amountCents: 500,
    });
    if (tx?.transaction?.id) {
      await post(`/api/transactions/${tx.transaction.id}/dispatch`);
    }
  };

  const simulateReceipt = async () => {
    if (!agentId) {
      setLog("Error: No agent available. Please seed the database first.");
      return;
    }
    const tx = await post("/api/transactions", {
      agentId,
      amountCents: 500,
    });
    const id = tx?.transaction?.id;
    if (id) {
      await post(`/api/transactions/${id}/receipt`, {
        transaction_id: id,
        status: "success",
        output: { ok: true },
      });
    }
  };

  const checkHealth = async () => {
    setLoading(true);
    try {
      console.log(`Making GET request to: /api/health`);
      const res = await fetch("/api/health", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      console.log(`Response status: ${res.status}`);
      let data = {};
      try {
        const text = await res.text();
        console.log(`Response text:`, text);
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        data = { error: "Invalid JSON response", rawResponse: text };
      }
      
      const logData = { 
        url: "/api/health", 
        method: "GET",
        status: res.status, 
        statusText: res.statusText,
        data,
        timestamp: new Date().toISOString()
      };
      setLog(JSON.stringify(logData, null, 2));
      return data;
    } catch (error) {
      console.error("Network error:", error);
      const errorData = { 
        error: "Network error", 
        message: error instanceof Error ? error.message : String(error),
        url: "/api/health",
        timestamp: new Date().toISOString()
      };
      setLog(JSON.stringify({ url: "/api/health", status: 0, data: errorData }, null, 2));
      return errorData;
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto bg-white">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Agent Marketplace – Test Panel</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-800">
          <strong className="text-blue-900">Agent Status:</strong> 
          <span className="ml-2">
            {agentId ? (
              <span className="text-green-700 font-medium">✅ Connected ({agentId.slice(0, 8)}...)</span>
            ) : (
              <span className="text-red-700 font-medium">❌ No agent found - run seed script first</span>
            )}
          </span>
        </p>
      </div>

      <div className="grid gap-4">
        <button 
          onClick={checkHealth} 
          disabled={loading}
          className="px-6 py-3 rounded-lg bg-gray-600 text-white font-medium hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Loading..." : "0) Health Check"}
        </button>
        <button 
          onClick={createMandate} 
          disabled={loading}
          className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Loading..." : "1) Create Mandate ($20 cap)"}
        </button>
        <button 
          onClick={createTx} 
          disabled={loading || !agentId}
          className="px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Loading..." : "2) Create $5 Transaction"}
        </button>
        <button 
          onClick={dispatchTx} 
          disabled={loading || !agentId}
          className="px-6 py-3 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Loading..." : "3) Create & Dispatch (requires agent URL/token)"}
        </button>
        <button 
          onClick={simulateReceipt} 
          disabled={loading || !agentId}
          className="px-6 py-3 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Loading..." : "4) Create & Simulate Receipt (captures Stripe)"}
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">API Response Log</h2>
        <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-sm overflow-auto h-80 font-mono border">
          {log || "Logs will appear here…"}
        </pre>
      </div>
    </main>
  );
}
