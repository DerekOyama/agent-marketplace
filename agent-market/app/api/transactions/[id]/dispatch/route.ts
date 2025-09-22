import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { StandardAgentInput, StandardAgentOutput } from "../../../../../types/agent-schemas";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tx = await prisma.transaction.findUnique({ 
      where: { id }, 
      include: { agent: true }
    });
    
    if (!tx) {
      return NextResponse.json({ error: "transaction_not_found" }, { status: 404 });
    }
    
    if (!tx.agent) {
      return NextResponse.json({ error: "agent_not_found" }, { status: 404 });
    }
    
    // Prepare standardized input for agent
    const standardInput: StandardAgentInput = {
      data: {
        transaction: {
          id: tx.id,
          amount_cents: tx.amountCents,
          currency: tx.currency
        },
        mandate_summary: {
          max_amount_cents: 999999
        },
        // Include any request data from the transaction
        ...(tx.requestJson as Record<string, unknown> || {})
      },
      metadata: {
        requestId: `tx_${tx.id}`,
        userId: tx.userId,
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      },
      config: {
        timeout: 30000
      }
    };
    
    // Check if this is a demo agent with placeholder URLs
    const isDemoAgent = tx.agent.runUrl.includes("YOUR-N8N") || 
                       tx.agent.runUrl.includes("localhost") ||
                       tx.agent.token === "PUT_A_LONG_RANDOM_TOKEN_HERE";
    
    let receipt: StandardAgentOutput;
    let agentResponseStatus = 200;
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    if (isDemoAgent) {
      // Simulate standardized agent response for demo
      receipt = {
        success: true,
        data: {
          transaction_id: tx.id,
          status: "success",
          message: "Demo agent executed successfully",
          simulated: true,
          agent_name: tx.agent.name
        },
        metadata: {
          executionId,
          timestamp: new Date().toISOString(),
          duration: Math.floor(Math.random() * 1000) + 500
        },
        usage: {
          creditsConsumed: tx.amountCents,
          tokensUsed: Math.floor(Math.random() * 100) + 50
        }
      };
      agentResponseStatus = 200;
    } else {
      // Try to call real agent
      try {
        const res = await fetch(tx.agent.runUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${tx.agent.token}`, 
            "X-Idempotency-Key": tx.id,
            "X-Execution-ID": executionId
          },
          body: JSON.stringify(standardInput),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        
        agentResponseStatus = res.status;
        const rawResponse = await res.json().catch(() => null);
        
        if (rawResponse && rawResponse.success !== undefined && rawResponse.data !== undefined && rawResponse.metadata !== undefined) {
          // Already in standard format
          receipt = rawResponse as StandardAgentOutput;
        } else {
          // Convert legacy format to standard format
          receipt = {
            success: res.ok,
            data: rawResponse || { error: "Invalid JSON response from agent", status: res.status },
            metadata: {
              executionId,
              timestamp: new Date().toISOString(),
              duration: Date.now() - startTime
            }
          };
        }
      } catch (fetchError) {
        console.error("Agent fetch error:", fetchError);
        receipt = {
          success: false,
          data: {},
          metadata: {
            executionId,
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime
          },
          error: {
            code: "AGENT_UNREACHABLE",
            message: "Agent unreachable",
            details: {
              originalError: fetchError instanceof Error ? fetchError.message : String(fetchError),
              agent_url: tx.agent.runUrl
            }
          }
        };
        agentResponseStatus = 500;
      }
    }
    
    // Log the dispatch attempt
    await prisma.auditLog.create({ 
      data: { 
        txId: tx.id, 
        actor: "marketplace", 
        event: "dispatched", 
        payload: {
          standardInput: JSON.parse(JSON.stringify(standardInput)), // Convert to plain object
          agent_url: tx.agent.runUrl,
          is_demo: isDemoAgent,
          execution_id: executionId
        }
      } 
    });
    
    // Return standardized response
    return NextResponse.json({ 
      receiptFromAgent: receipt, 
      status: agentResponseStatus,
      isDemo: isDemoAgent,
      executionId,
      standardFormat: true
    }, { status: 200 });
    
  } catch (error) {
    console.error("Dispatch error:", error);
    return NextResponse.json({ 
      error: "internal_error", 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
