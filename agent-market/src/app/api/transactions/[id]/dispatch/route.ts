import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tx = await prisma.transaction.findUnique({ 
      where: { id: params.id }, 
      include: { agent: true }
    });
    
    if (!tx) {
      return NextResponse.json({ error: "transaction_not_found" }, { status: 404 });
    }
    
    if (!tx.agent) {
      return NextResponse.json({ error: "agent_not_found" }, { status: 404 });
    }
    
    const payload = { 
      tx: { 
        id: tx.id, 
        amount_cents: tx.amountCents, 
        currency: tx.currency 
      }, 
      mandate_summary: { 
        max_amount_cents: 999999 
      } 
    };
    
    // Check if this is a demo agent with placeholder URLs
    const isDemoAgent = tx.agent.runUrl.includes("YOUR-N8N") || 
                       tx.agent.runUrl.includes("localhost") ||
                       tx.agent.token === "PUT_A_LONG_RANDOM_TOKEN_HERE";
    
    let receipt = null;
    let agentResponseStatus = 200;
    
    if (isDemoAgent) {
      // Simulate agent response for demo
      receipt = {
        transaction_id: tx.id,
        status: "success",
        output: { 
          message: "Demo agent executed successfully",
          simulated: true,
          agent_name: tx.agent.name
        },
        usage: {
          duration_ms: Math.floor(Math.random() * 1000) + 500
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
            "X-Idempotency-Key": tx.id 
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        
        agentResponseStatus = res.status;
        receipt = await res.json().catch(() => ({
          error: "Invalid JSON response from agent",
          status: res.status
        }));
      } catch (fetchError) {
        console.error("Agent fetch error:", fetchError);
        receipt = {
          error: "Agent unreachable",
          message: fetchError instanceof Error ? fetchError.message : String(fetchError),
          agent_url: tx.agent.runUrl
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
          ...payload,
          agent_url: tx.agent.runUrl,
          is_demo: isDemoAgent
        }
      } 
    });
    
    return NextResponse.json({ 
      receiptFromAgent: receipt, 
      status: agentResponseStatus,
      isDemo: isDemoAgent
    }, { status: 200 });
    
  } catch (error) {
    console.error("Dispatch error:", error);
    return NextResponse.json({ 
      error: "internal_error", 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
