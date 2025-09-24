import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { stripe } from "../../../../lib/stripe";
import { getCurrentUserId } from "../../../../lib/auth";
import { CreditManager } from "../../../../lib/credit-manager";

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({
        status: "pending",
        message: "Payment not yet marked as paid by Stripe",
      });
    }

    const metaUserId = session.metadata?.userId;
    const amountCents = parseInt(session.metadata?.amountCents || "0");

    if (!metaUserId || metaUserId !== userId) {
      return NextResponse.json({ error: "user_mismatch" }, { status: 403 });
    }

    // Find existing pending purchase
    let creditPurchase = await (prisma as any).creditPurchase.findFirst({
      where: {
        userId,
        stripeCheckoutSessionId: sessionId,
        status: "pending",
      },
    });

    // Fallback: create pending if missing
    if (!creditPurchase) {
      creditPurchase = await (prisma as any).creditPurchase.create({
        data: {
          userId,
          amountCents: typeof session.amount_total === "number" ? session.amount_total : amountCents,
          creditsPurchased: typeof session.amount_total === "number" ? session.amount_total : amountCents,
          currency: (session.currency || "usd").toLowerCase(),
          stripeCheckoutSessionId: session.id,
          status: "pending",
          metadata: { createdByConfirmEndpoint: true },
        },
      });
    }

    // Process success
    const result = await CreditManager.processPurchaseSuccess(
      creditPurchase.id,
      (session.payment_intent as string) || undefined,
    );

    if (!result.success) {
      return NextResponse.json({ error: "process_failed", details: result.error }, { status: 500 });
    }

    // Optionally fetch balance to return
    const updatedUser = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { creditBalanceCents: true },
    });

    return NextResponse.json({ status: "completed", newBalance: updatedUser?.creditBalanceCents ?? null });
  } catch (error) {
    console.error("Confirm purchase error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}


