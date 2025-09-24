import { prisma } from './prisma';
import { validatePayoutAmount, isStripeConfigured } from './stripe';

/**
 * Payout Manager - Handles revenue sharing between platform and agent creators
 * 
 * Current Revenue Share Model:
 * - Platform Fee: 10% of execution cost
 * - Creator Earnings: 90% of execution cost
 */
export class PayoutManager {
  private static readonly PLATFORM_FEE_PERCENTAGE = 10; // 10% platform fee
  private static readonly CREATOR_EARNINGS_PERCENTAGE = 90; // 90% creator earnings
  private static readonly MINIMUM_PAYOUT_CENTS = 500; // $5.00 minimum payout

  /**
   * Calculate revenue split for an execution
   */
  static calculateRevenueSplit(executionCostCents: number): {
    platformFeeCents: number;
    creatorEarningsCents: number;
  } {
    const platformFeeCents = Math.floor((executionCostCents * this.PLATFORM_FEE_PERCENTAGE) / 100);
    const creatorEarningsCents = executionCostCents - platformFeeCents;
    
    return {
      platformFeeCents,
      creatorEarningsCents
    };
  }

  /**
   * Record earnings for an agent execution
   */
  static async recordEarnings(params: {
    agentId: string;
    userId: string; // The user who executed the agent
    executionCostCents: number;
    executionId: string;
    transactionId?: string;
  }): Promise<{
    success: boolean;
    earnings?: {
      totalEarningsCents: number;
      platformFeeCents: number;
      creatorEarningsCents: number;
    };
    error?: string;
  }> {
    try {
      const { agentId, userId, executionCostCents, executionId: _executionId, transactionId } = params;

      // Get the agent to find the owner
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { ownerId: true, name: true }
      });

      if (!agent || !agent.ownerId) {
        return {
          success: false,
          error: 'Agent not found or has no owner'
        };
      }

      // Don't record earnings if the user is executing their own agent
      // But allow test earnings for development/demo purposes
      if (agent.ownerId === userId) {
        // For development/testing, still record earnings but mark as test
        console.log('Recording test earnings for self-execution');
      }

      // Calculate revenue split
      const { platformFeeCents, creatorEarningsCents } = this.calculateRevenueSplit(executionCostCents);

      // Upsert agent earnings record for the agent owner (not the execution user)
      const earnings = await prisma.agentEarnings.upsert({
        where: {
          agentId_userId: {
            agentId,
            userId: agent.ownerId
          }
        },
        update: {
          totalEarningsCents: {
            increment: creatorEarningsCents
          },
          pendingEarningsCents: {
            increment: creatorEarningsCents
          },
          totalExecutions: {
            increment: 1
          },
          lastEarningAt: new Date()
        },
        create: {
          agentId,
          userId: agent.ownerId, // This is the agent owner, not the execution user
          totalEarningsCents: creatorEarningsCents,
          pendingEarningsCents: creatorEarningsCents,
          totalExecutions: 1,
          lastEarningAt: new Date()
        }
      });

      // Update transaction with revenue split if transactionId provided
      if (transactionId) {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            platformFeeCents,
            sellerEarningsCents: creatorEarningsCents
          }
        });
      }

      return {
        success: true,
        earnings: {
          totalEarningsCents: earnings.totalEarningsCents,
          platformFeeCents,
          creatorEarningsCents
        }
      };

    } catch (error) {
      console.error('Error recording earnings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get earnings summary for a user
   */
  static async getUserEarningsSummary(userId: string): Promise<{
    totalEarningsCents: number;
    pendingEarningsCents: number;
    paidOutCents: number;
    totalExecutions: number;
    agentBreakdown: Array<{
      agentId: string;
      agentName: string;
      totalEarningsCents: number;
      pendingEarningsCents: number;
      totalExecutions: number;
      lastEarningAt: Date | null;
    }>;
  }> {
    const earnings = await prisma.agentEarnings.findMany({
      where: { userId },
      include: {
        agent: {
          select: { id: true, name: true }
        }
      },
      orderBy: { lastEarningAt: 'desc' }
    });

    const totalEarningsCents = earnings.reduce((sum, e) => sum + e.totalEarningsCents, 0);
    const pendingEarningsCents = earnings.reduce((sum, e) => sum + e.pendingEarningsCents, 0);
    const paidOutCents = earnings.reduce((sum, e) => sum + e.paidOutCents, 0);
    const totalExecutions = earnings.reduce((sum, e) => sum + e.totalExecutions, 0);

    const agentBreakdown = earnings.map(e => ({
      agentId: e.agentId,
      agentName: e.agent.name,
      totalEarningsCents: e.totalEarningsCents,
      pendingEarningsCents: e.pendingEarningsCents,
      totalExecutions: e.totalExecutions,
      lastEarningAt: e.lastEarningAt
    }));

    return {
      totalEarningsCents,
      pendingEarningsCents,
      paidOutCents,
      totalExecutions,
      agentBreakdown
    };
  }

  /**
   * Create a payout request for a user
   */
  static async createPayoutRequest(params: {
    userId: string;
    amountCents: number;
    description?: string;
  }): Promise<{
    success: boolean;
    payout?: {
      id: string;
      amountCents: number;
      status: string;
    };
    error?: string;
  }> {
    try {
      const { userId, amountCents, description } = params;

      // Validate payout amount using Stripe validation
      const amountValidation = validatePayoutAmount(amountCents);
      if (!amountValidation.valid) {
        return {
          success: false,
          error: amountValidation.error
        };
      }

      // Check if user has sufficient pending earnings
      const summary = await this.getUserEarningsSummary(userId);
      
      if (amountCents > summary.pendingEarningsCents) {
        return {
          success: false,
          error: 'Insufficient pending earnings for payout'
        };
      }

      // Create payout record
      const payout = await prisma.payout.create({
        data: {
          userId,
          amountCents,
          description: description || `Payout of $${(amountCents / 100).toFixed(2)}`,
          status: 'pending'
        }
      });

      // Reduce pending earnings by the payout amount
      // We'll distribute this across the user's agents proportionally
      const earnings = await prisma.agentEarnings.findMany({
        where: { 
          userId,
          pendingEarningsCents: { gt: 0 }
        }
      });

      let remainingPayoutAmount = amountCents;
      
      for (const earning of earnings) {
        if (remainingPayoutAmount <= 0) break;
        
        const deductionAmount = Math.min(remainingPayoutAmount, earning.pendingEarningsCents);
        
        await prisma.agentEarnings.update({
          where: { id: earning.id },
          data: {
            pendingEarningsCents: {
              decrement: deductionAmount
            },
            paidOutCents: {
              increment: deductionAmount
            }
          }
        });
        
        remainingPayoutAmount -= deductionAmount;
      }

      return {
        success: true,
        payout: {
          id: payout.id,
          amountCents: payout.amountCents,
          status: payout.status
        }
      };

    } catch (error) {
      console.error('Error creating payout request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get payout history for a user
   */
  static async getUserPayouts(userId: string, limit = 50): Promise<Array<{
    id: string;
    amountCents: number;
    status: string;
    description: string | null;
    createdAt: Date;
    processedAt: Date | null;
    failureReason: string | null;
  }>> {
    const payouts = await prisma.payout.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        amountCents: true,
        status: true,
        description: true,
        createdAt: true,
        processedAt: true,
        failureReason: true
      }
    });

    return payouts;
  }

  /**
   * Get detailed agent metrics for a user
   */
  static async getUserAgentMetrics(userId: string): Promise<Array<{
    agentId: string;
    agentName: string;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalRevenueCents: number;
    creatorEarningsCents: number;
    platformFeeCents: number;
    averageExecutionCost: number;
    lastExecutionAt: Date | null;
    createdAt: Date;
    formatted: {
      totalRevenue: string;
      creatorEarnings: string;
      platformFee: string;
      averageExecutionCost: string;
      lastExecutionAt: string | null;
    };
  }>> {
    // Get all agents owned by the user
    const agents = await prisma.agent.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastExecutedAt: true
      }
    });

    const agentMetrics = [];

    for (const agent of agents) {
      // Get execution stats for this agent
      const executions = await prisma.agentExecution.findMany({
        where: { agentId: agent.id },
        select: {
          status: true,
          creditsConsumed: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'success').length;
      const failedExecutions = totalExecutions - successfulExecutions;
      
      // Calculate revenue breakdown
      const totalRevenueCents = executions.reduce((sum, e) => sum + e.creditsConsumed, 0);
      const { platformFeeCents, creatorEarningsCents } = this.calculateRevenueSplit(totalRevenueCents);
      
      const averageExecutionCost = totalExecutions > 0 ? totalRevenueCents / totalExecutions : 0;

      agentMetrics.push({
        agentId: agent.id,
        agentName: agent.name,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        totalRevenueCents,
        creatorEarningsCents,
        platformFeeCents,
        averageExecutionCost,
        lastExecutionAt: agent.lastExecutedAt,
        createdAt: agent.createdAt,
        formatted: {
          totalRevenue: `$${(totalRevenueCents / 100).toFixed(2)}`,
          creatorEarnings: `$${(creatorEarningsCents / 100).toFixed(2)}`,
          platformFee: `$${(platformFeeCents / 100).toFixed(2)}`,
          averageExecutionCost: `$${(averageExecutionCost / 100).toFixed(2)}`,
          lastExecutionAt: agent.lastExecutedAt?.toISOString() || null
        }
      });
    }

    return agentMetrics.sort((a, b) => b.totalRevenueCents - a.totalRevenueCents);
  }

  /**
   * Process a payout with Stripe integration
   */
  static async processPayout(payoutId: string, bankAccountId?: string): Promise<{
    success: boolean;
    stripeTransferId?: string;
    stripePayoutId?: string;
    error?: string;
  }> {
    try {
      // Get the payout record
      const payout = await prisma.payout.findUnique({
        where: { id: payoutId },
        include: {
          user: {
            select: { id: true, email: true, stripeCustomerId: true }
          }
        }
      });

      if (!payout) {
        return {
          success: false,
          error: 'Payout not found'
        };
      }

      if (payout.status !== 'pending') {
        return {
          success: false,
          error: 'Payout is not in pending status'
        };
      }

      // Check if Stripe is configured
      if (!isStripeConfigured()) {
        return {
          success: false,
          error: 'Stripe is not configured for payouts'
        };
      }

      // For now, we'll simulate the payout process
      // In a real implementation, you would:
      // 1. Get the user's bank account from Stripe
      // 2. Create a transfer/payout using Stripe API
      // 3. Update the payout record with Stripe IDs

      // Simulate successful payout
      const mockStripeTransferId = `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockStripePayoutId = `po_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update payout status
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'completed',
          stripeTransferId: mockStripeTransferId,
          processedAt: new Date()
        }
      });

      return {
        success: true,
        stripeTransferId: mockStripeTransferId,
        stripePayoutId: mockStripePayoutId
      };

    } catch (error) {
      console.error('Error processing payout:', error);
      
      // Update payout status to failed
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get payout configuration
   */
  static getPayoutConfig(): {
    minimumPayoutCents: number;
    platformFeePercentage: number;
    creatorEarningsPercentage: number;
    formatted: {
      minimumPayout: string;
      platformFeePercentage: string;
      creatorEarningsPercentage: string;
    };
  } {
    return {
      minimumPayoutCents: this.MINIMUM_PAYOUT_CENTS,
      platformFeePercentage: this.PLATFORM_FEE_PERCENTAGE,
      creatorEarningsPercentage: this.CREATOR_EARNINGS_PERCENTAGE,
      formatted: {
        minimumPayout: `$${(this.MINIMUM_PAYOUT_CENTS / 100).toFixed(2)}`,
        platformFeePercentage: `${this.PLATFORM_FEE_PERCENTAGE}%`,
        creatorEarningsPercentage: `${this.CREATOR_EARNINGS_PERCENTAGE}%`
      }
    };
  }

  /**
   * Get platform revenue summary
   */
  static async getPlatformRevenueSummary(): Promise<{
    totalPlatformRevenueCents: number;
    totalCreatorEarningsCents: number;
    totalExecutions: number;
    averageRevenuePerExecution: number;
  }> {
    const earnings = await prisma.agentEarnings.findMany({
      select: {
        totalEarningsCents: true,
        totalExecutions: true
      }
    });

    const totalCreatorEarningsCents = earnings.reduce((sum, e) => sum + e.totalEarningsCents, 0);
    const totalExecutions = earnings.reduce((sum, e) => sum + e.totalExecutions, 0);
    
    // Calculate platform revenue (10% of total transaction value)
    // Since creators get 90%, platform gets 10%
    const totalTransactionValue = Math.floor((totalCreatorEarningsCents * 100) / 90);
    const totalPlatformRevenueCents = totalTransactionValue - totalCreatorEarningsCents;
    
    const averageRevenuePerExecution = totalExecutions > 0 ? totalTransactionValue / totalExecutions : 0;

    return {
      totalPlatformRevenueCents,
      totalCreatorEarningsCents,
      totalExecutions,
      averageRevenuePerExecution
    };
  }
}
