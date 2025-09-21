import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log("Receipt endpoint called for transaction:", id);
    
    const body = await req.json();
    console.log("Receipt request body:", body);
    
    // Simple validation without Zod
    if (!body.transaction_id || !body.status) {
      return NextResponse.json({ 
        error: "Missing required fields",
        required: ["transaction_id", "status"]
      }, { status: 400 });
    }
    
    if (!["success", "failed"].includes(body.status)) {
      return NextResponse.json({ 
        error: "Invalid status",
        valid_statuses: ["success", "failed"]
      }, { status: 400 });
    }
    
    // Find the transaction
    const tx = await prisma.transaction.findUnique({ 
      where: { id }
    });
    
    if (!tx) {
      console.log("Transaction not found:", id);
      return NextResponse.json({ 
        error: "Transaction not found",
        transaction_id: id
      }, { status: 404 });
    }
    
    console.log("Found transaction:", tx);
    
    // Update transaction status
    const newStatus = body.status === "success" ? "succeeded" : "failed";
    
    const updatedTx = await prisma.transaction.update({ 
      where: { id: tx.id }, 
      data: { 
        status: newStatus, 
        receiptJson: {
          ...body,
          processed_at: new Date().toISOString()
        }
      } 
    });
    
    console.log("Updated transaction:", updatedTx);
    
    // Create audit log
    await prisma.auditLog.create({ 
      data: { 
        txId: tx.id, 
        actor: "agent", 
        event: "receipt", 
        payload: body
      } 
    });
    
    console.log("Audit log created");
    
    return NextResponse.json({ 
      success: true,
      transaction: {
        id: updatedTx.id,
        status: updatedTx.status,
        amount_cents: updatedTx.amountCents,
        currency: updatedTx.currency
      },
      message: "Receipt processed successfully"
    }, { status: 200 });
    
  } catch (error) {
    console.error("Receipt processing error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : String(error),
      transaction_id: params.id
    }, { status: 500 });
  }
}