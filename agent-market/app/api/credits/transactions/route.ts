import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUserId } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
	try {
		const userId = await getCurrentUserId();
		if (!userId) {
			return NextResponse.json({ error: "unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const limitParam = searchParams.get("limit");
		const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 100);

		const [user, transactions] = await Promise.all([
			(prisma as any).user.findUnique({ where: { id: userId }, select: { creditBalanceCents: true } }),
			(prisma as any).creditTransaction.findMany({
				where: { userId },
				orderBy: { createdAt: "desc" },
				take: limit,
				include: { creditPurchase: { select: { id: true, stripePaymentIntentId: true, stripeCheckoutSessionId: true } } }
			})
		]);

		if (!user) {
			return NextResponse.json({ error: "user_not_found" }, { status: 404 });
		}

		return NextResponse.json({
			currentBalance: user.creditBalanceCents,
                  transactions: transactions.map((t: any) => ({
				id: t.id,
				amountCents: t.amountCents,
				type: t.type,
				description: t.description,
				balanceBeforeCents: t.balanceBeforeCents,
				balanceAfterCents: t.balanceAfterCents,
				referenceId: t.referenceId || undefined,
				referenceType: t.referenceType || undefined,
				createdAt: t.createdAt.toISOString(),
				metadata: t.metadata as Record<string, unknown> | null,
                purchase: t.creditPurchase ? {
                    id: t.creditPurchase.id,
                    stripePaymentIntentId: (t.creditPurchase as { stripePaymentIntentId?: string | null }).stripePaymentIntentId,
                    stripeCheckoutSessionId: (t.creditPurchase as { stripeCheckoutSessionId?: string | null }).stripeCheckoutSessionId
                } : undefined
			}))
		});
	} catch (error) {
		console.error("Credit transactions fetch error:", error);
		return NextResponse.json({ 
			error: "internal_error", 
			message: error instanceof Error ? error.message : String(error)
		}, { status: 500 });
	}
}

