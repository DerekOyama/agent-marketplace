import { NextRequest } from "next/server";
import { CreditManager } from "../../../../lib/credit-manager";
import { z } from "zod";
import { ApiHandler, CommonSchemas } from "../../../../lib/api-utils";

const AddCreditsSchema = z.object({
  amountCents: CommonSchemas.amountCents,
  type: z.enum(['bonus', 'adjustment']).default('bonus'),
  description: z.string().optional()
});

export const POST = ApiHandler.createPostHandler(
  AddCreditsSchema,
  async (req: NextRequest, userId: string, data) => {
    // Add credits using CreditManager for proper transaction tracking
    const result = await CreditManager.addCredits({
      userId,
      amountCents: data.amountCents,
      type: data.type,
      description: data.description || `Credit ${data.type}: ${data.amountCents} cents`,
      metadata: {
        source: 'manual_addition',
        timestamp: new Date().toISOString()
      }
    });

    if (!result.success) {
      throw new Error(`Failed to add credits: ${result.error}`);
    }

    // Get updated user info
    const balanceResult = await CreditManager.getBalance(userId);

    return {
      transaction: result.transaction,
      newBalance: result.newBalance,
      user: {
        id: userId,
        creditBalanceCents: balanceResult.balance
      }
    };
  }
);
