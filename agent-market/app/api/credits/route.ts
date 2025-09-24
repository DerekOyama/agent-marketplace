import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { ApiHandler, ErrorHelpers } from "../../../lib/api-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET - Get user's current credit balance
export const GET = ApiHandler.createGetHandler(async (req: NextRequest, userId: string) => {
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      email: true, 
      creditBalanceCents: true,
      updatedAt: true
    }
  });

  if (!user) {
    throw ErrorHelpers.notFound("User", userId);
  }

  return { user };
});

// POST - Update user's credit balance (for adding credits, etc.)
const UpdateCreditsSchema = z.object({
  amountCents: z.number().int().positive("Amount must be a positive integer"),
  operation: z.enum(['add', 'subtract']).default('add')
});

export const POST = ApiHandler.createPostHandler(
  UpdateCreditsSchema,
  async (req: NextRequest, userId: string, data) => {
    // Get current user
    const user = await (prisma as any).user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw ErrorHelpers.notFound("User", userId);
    }

    let newBalance;
    if (data.operation === "add") {
      newBalance = user.creditBalanceCents + data.amountCents;
    } else {
      newBalance = user.creditBalanceCents - data.amountCents;
      if (newBalance < 0) {
        throw ErrorHelpers.insufficientCredits(data.amountCents, user.creditBalanceCents);
      }
    }

    const updatedUser = await (prisma as any).user.update({
      where: { id: userId },
      data: { creditBalanceCents: newBalance },
      select: { 
        id: true, 
        email: true, 
        creditBalanceCents: true,
        updatedAt: true
      }
    });

    return {
      user: updatedUser,
      operation: data.operation,
      amountCents: data.amountCents,
      previousBalance: user.creditBalanceCents,
      newBalance
    };
  }
);
