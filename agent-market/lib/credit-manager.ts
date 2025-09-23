import { prisma } from "./prisma";
import type { CreditTransaction, Prisma } from "@prisma/client";

export interface CreditTransactionInput {
  userId: string;
  amountCents: number; // Positive for credits added, negative for credits used
  type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'adjustment';
  description: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, unknown>;
  creditPurchaseId?: string;
}

export class CreditManager {
  /**
   * Add credits to user account with transaction tracking
   */
  static async addCredits(input: CreditTransactionInput): Promise<{
    success: boolean;
    transaction?: CreditTransaction;
    newBalance?: number;
    error?: string;
  }> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get current user and lock the row
        const user = await tx.user.findUnique({
          where: { id: input.userId },
          select: { creditBalanceCents: true }
        });

        if (!user) {
          return { success: false, error: "User not found" };
        }

        const balanceBefore = user.creditBalanceCents;
        const balanceAfter = balanceBefore + input.amountCents;

        // Ensure balance doesn't go negative for additions
        if (input.amountCents < 0 && balanceAfter < 0) {
          return { success: false, error: "Insufficient credits" };
        }

        // Update user balance
        await tx.user.update({
          where: { id: input.userId },
          data: { creditBalanceCents: balanceAfter }
        });

        // Create transaction record
        const transaction = await tx.creditTransaction.create({
          data: {
            userId: input.userId,
            amountCents: input.amountCents,
            type: input.type,
            description: input.description,
            referenceId: input.referenceId,
            referenceType: input.referenceType,
            balanceBeforeCents: balanceBefore,
            balanceAfterCents: balanceAfter,
            metadata: input.metadata as Prisma.InputJsonValue,
            creditPurchaseId: input.creditPurchaseId
          }
        });

        return {
          success: true,
          transaction,
          newBalance: balanceAfter
        };
      });
    } catch (error) {
      console.error("CreditManager.addCredits error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Deduct credits from user account with transaction tracking
   */
  static async deductCredits(input: Omit<CreditTransactionInput, 'amountCents'> & {
    amountCents: number; // Must be positive
  }): Promise<{
    success: boolean;
    transaction?: CreditTransaction;
    newBalance?: number;
    error?: string;
  }> {
    // Ensure amount is positive for deduction
    const deductAmount = Math.abs(input.amountCents);
    
    return this.addCredits({
      ...input,
      amountCents: -deductAmount, // Make it negative for deduction
      type: 'usage'
    });
  }

  /**
   * Check if user has sufficient credits
   */
  static async hasSufficientCredits(userId: string, amountCents: number): Promise<{
    sufficient: boolean;
    currentBalance: number;
    required: number;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { creditBalanceCents: true }
      });

      if (!user) {
        return { sufficient: false, currentBalance: 0, required: amountCents };
      }

      return {
        sufficient: user.creditBalanceCents >= amountCents,
        currentBalance: user.creditBalanceCents,
        required: amountCents
      };
    } catch (error) {
      console.error("CreditManager.hasSufficientCredits error:", error);
      return { sufficient: false, currentBalance: 0, required: amountCents };
    }
  }

  /**
   * Get user's current credit balance
   */
  static async getBalance(userId: string): Promise<{
    balance: number;
    error?: string;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { creditBalanceCents: true }
      });

      if (!user) {
        return { balance: 0, error: "User not found" };
      }

      return { balance: user.creditBalanceCents };
    } catch (error) {
      console.error("CreditManager.getBalance error:", error);
      return {
        balance: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Process successful credit purchase
   */
  static async processPurchaseSuccess(
    creditPurchaseId: string,
    stripePaymentIntentId?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get the purchase record
        const purchase = await tx.creditPurchase.findUnique({
          where: { id: creditPurchaseId },
          include: { user: { select: { id: true, creditBalanceCents: true } } }
        });

        if (!purchase) {
          return { success: false, error: "Purchase not found" };
        }

        if (purchase.status === "completed") {
          return { success: true }; // Already processed
        }

        // Update purchase status
        await tx.creditPurchase.update({
          where: { id: creditPurchaseId },
          data: {
            status: "completed",
            completedAt: new Date(),
            stripePaymentIntentId: stripePaymentIntentId || purchase.stripePaymentIntentId
          }
        });

        // Add credits to user account
        const result = await this.addCredits({
          userId: purchase.userId,
          amountCents: purchase.creditsPurchased,
          type: "purchase",
          description: `Credit purchase - ${purchase.creditsPurchased} credits`,
          referenceId: creditPurchaseId,
          referenceType: "purchase",
          creditPurchaseId: creditPurchaseId,
          metadata: {
            purchaseAmount: purchase.amountCents,
            currency: purchase.currency,
            stripePaymentIntentId: stripePaymentIntentId || purchase.stripePaymentIntentId
          }
        });

        return result;
      });
    } catch (error) {
      console.error("CreditManager.processPurchaseSuccess error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
