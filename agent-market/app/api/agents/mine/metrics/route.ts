import { NextRequest } from "next/server";
import { ApiResponse, withAuth } from "../../../../../lib/api-utils";
import { PayoutManager } from "../../../../../lib/payout-manager";

/**
 * GET /api/agents/mine/metrics - Get detailed metrics for user's own agents
 */
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Get detailed agent metrics
    const agentMetrics = await PayoutManager.getUserAgentMetrics(userId);
    
    // Get payout configuration
    const payoutConfig = PayoutManager.getPayoutConfig();
    
    // Get earnings summary
    const earningsSummary = await PayoutManager.getUserEarningsSummary(userId);

    return ApiResponse.success({
      payoutConfig,
      earningsSummary: {
        totalEarningsCents: earningsSummary.totalEarningsCents,
        pendingEarningsCents: earningsSummary.pendingEarningsCents,
        paidOutCents: earningsSummary.paidOutCents,
        totalExecutions: earningsSummary.totalExecutions,
        formatted: {
          totalEarnings: `$${(earningsSummary.totalEarningsCents / 100).toFixed(2)}`,
          pendingEarnings: `$${(earningsSummary.pendingEarningsCents / 100).toFixed(2)}`,
          paidOut: `$${(earningsSummary.paidOutCents / 100).toFixed(2)}`
        }
      },
      agentMetrics,
      canRequestPayout: earningsSummary.pendingEarningsCents >= payoutConfig.minimumPayoutCents
    });

  } catch (error) {
    console.error('Error fetching agent metrics:', error);
    return ApiResponse.error('fetch_failed', 'Failed to fetch agent metrics');
  }
});
