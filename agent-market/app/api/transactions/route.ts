import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import Stripe from "stripe";
import { z } from "zod";
import { getCurrentUserId } from "../../../lib/auth";

// Define schemas inline to avoid import issues
const CreateTxSchema = z.object({
  agentId: z.string(),
  amountCents: z.number().int().positive(),
  currency: z.string().default("USD"),
  input: z.record(z.string(), z.unknown()).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateTxSchema.safeParse(body);
    
    if (!parsed.success) {
      console.error("Validation error:", parsed.error);
      return NextResponse.json({ 
        error: "bad_request", 
        details: parsed.error.issues 
      }, { status: 400 });
    }
    
    const { agentId, amountCents, currency } = parsed.data;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    
    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });
    if (!agent) {
      return NextResponse.json({ error: "agent_not_found" }, { status: 404 });
    }
    
    const mandate = await prisma.mandate.findFirst({ 
      where: { userId, status: "active" }
    });
    if (!mandate) {
      return NextResponse.json({ error: "no_mandate" }, { status: 400 });
    }
    
    const rules = mandate.rulesJson as Record<string, unknown>;
    if (amountCents > (Number(rules?.max_amount_cents) ?? 0)) {
      return NextResponse.json({ error: "over_cap" }, { status: 403 });
    }
    
    // Only create Stripe payment if we have a valid key
    let stripePi = null;
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_yourKeyHere") {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
        const pi = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: currency.toLowerCase(),
          capture_method: "manual",
          automatic_payment_methods: { enabled: true },
          description: "Agent job escrow"
        });
        stripePi = pi.id;
      } catch (stripeError) {
        console.error("Stripe error:", stripeError);
        return NextResponse.json({ 
          error: "stripe_error", 
          message: "Payment processing failed" 
        }, { status: 500 });
      }
    }
    
    const tx = await prisma.transaction.create({
      data: { 
        userId, 
        agentId, 
        amountCents, 
        currency, 
        status: "pending", 
        stripePi, 
        requestJson: JSON.parse(JSON.stringify(parsed.data))
      }
    });
    
    await prisma.auditLog.create({ 
      data: { 
        txId: tx.id, 
        actor: "marketplace", 
        event: "created", 
        payload: { amountCents, currency } 
      } 
    });
    
    return NextResponse.json({ 
      transaction: tx, 
      payment_intent: stripePi || "mock_payment_intent" 
    }, { status: 201 });
    
  } catch (error) {
    console.error("Transaction creation error:", error);
    return NextResponse.json({ 
      error: "internal_error", 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
