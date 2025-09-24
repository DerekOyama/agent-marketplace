import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiHandler, CommonSchemas, ApiResponse, withAuth } from "../../../lib/api-utils";
import { PayoutManager } from "../../../lib/payout-manager";

const CreatePayoutSchema = z.object({
  amountCents: CommonSchemas.amountCents,
  description: z.string().optional()
});

/**
 * GET /api/payouts - Get user's earnings summary and payout history
 */
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'summary'; // 'summary', 'history', or 'config'

  if (type === 'config') {
    // Get payout configuration
    const config = PayoutManager.getPayoutConfig();
    
    return ApiResponse.success({
      payoutConfig: config
    });
  } else if (type === 'summary') {
    // Get earnings summary
    const summary = await PayoutManager.getUserEarningsSummary(userId);
    
    return ApiResponse.success({
      earnings: {
        totalEarningsCents: summary.totalEarningsCents,
        pendingEarningsCents: summary.pendingEarningsCents,
        paidOutCents: summary.paidOutCents,
        totalExecutions: summary.totalExecutions,
        formatted: {
          totalEarnings: `$${(summary.totalEarningsCents / 100).toFixed(2)}`,
          pendingEarnings: `$${(summary.pendingEarningsCents / 100).toFixed(2)}`,
          paidOut: `$${(summary.paidOutCents / 100).toFixed(2)}`
        }
      },
      agentBreakdown: summary.agentBreakdown.map(agent => ({
        ...agent,
        formatted: {
          totalEarnings: `$${(agent.totalEarningsCents / 100).toFixed(2)}`,
          pendingEarnings: `$${(agent.pendingEarningsCents / 100).toFixed(2)}`,
          lastEarningAt: agent.lastEarningAt?.toISOString() || null
        }
      }))
    });
  } else if (type === 'history') {
    // Get payout history
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const payouts = await PayoutManager.getUserPayouts(userId, limit);
    
    return ApiResponse.success({
      payouts: payouts.map(payout => ({
        ...payout,
        formatted: {
          amount: `$${(payout.amountCents / 100).toFixed(2)}`,
          createdAt: payout.createdAt.toISOString(),
          processedAt: payout.processedAt?.toISOString() || null
        }
      }))
    });
  } else {
    return ApiResponse.error('invalid_type', 'Type must be "summary" or "history"');
  }
});

/**
 * POST /api/payouts - Create a new payout request
 */
export const POST = ApiHandler.createPostHandler(
  CreatePayoutSchema,
  async (req: NextRequest, userId: string, data) => {
    const { amountCents, description } = data;

    // Create payout request
    const result = await PayoutManager.createPayoutRequest({
      userId,
      amountCents,
      description
    });

    if (!result.success) {
      return ApiResponse.error('payout_failed', result.error);
    }

    return {
      payout: {
        ...result.payout,
        formatted: {
          amount: `$${(result.payout!.amountCents / 100).toFixed(2)}`
        }
      },
      message: 'Payout request created successfully'
    };
  }
);

