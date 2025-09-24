/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { ApiResponse, withAuth } from "../../../../lib/api-utils";
import { PayoutManager } from "../../../../lib/payout-manager";
import prisma from "../../../../lib/prisma";

/**
 * GET /api/admin/payouts - Get platform revenue summary and all payouts
 */
export const GET = withAuth(async (req: NextRequest) => {
  // Check if user is admin (you can implement your admin check logic here)
  // For now, we'll allow any authenticated user to access this endpoint
  
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'summary';

  if (type === 'summary') {
    // Get platform revenue summary
    const summary = await PayoutManager.getPlatformRevenueSummary();
    
    // Get total users and agents for additional context
    const [totalUsers, totalAgents] = await Promise.all([
      (prisma as any).user.count(),
      (prisma as any).agent.count()
    ]);

    return ApiResponse.success({
      platform: {
        totalPlatformRevenueCents: summary.totalPlatformRevenueCents,
        totalCreatorEarningsCents: summary.totalCreatorEarningsCents,
        totalExecutions: summary.totalExecutions,
        averageRevenuePerExecution: summary.averageRevenuePerExecution,
        formatted: {
          platformRevenue: `$${(summary.totalPlatformRevenueCents / 100).toFixed(2)}`,
          creatorEarnings: `$${(summary.totalCreatorEarningsCents / 100).toFixed(2)}`,
          averageRevenuePerExecution: `$${(summary.averageRevenuePerExecution / 100).toFixed(2)}`
        }
      },
      stats: {
        totalUsers,
        totalAgents,
        revenueShare: {
          platformFeePercentage: 10,
          creatorEarningsPercentage: 90
        }
      }
    });
  } else if (type === 'payouts') {
    // Get all payout requests
    const status = url.searchParams.get('status'); // pending, processing, completed, failed
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const whereClause = status ? { status } : {};

    const payouts = await (prisma as any).payout.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return ApiResponse.success({
      payouts: payouts.map((payout: any) => ({
        id: payout.id,
        amountCents: payout.amountCents,
        currency: payout.currency,
        status: payout.status,
        description: payout.description,
        failureReason: payout.failureReason,
        stripeTransferId: payout.stripeTransferId,
        createdAt: payout.createdAt.toISOString(),
        processedAt: payout.processedAt?.toISOString() || null,
        user: payout.user,
        formatted: {
          amount: `$${(payout.amountCents / 100).toFixed(2)}`,
          createdAt: payout.createdAt.toISOString(),
          processedAt: payout.processedAt?.toISOString() || null
        }
      }))
    });
  } else {
    return ApiResponse.error('invalid_type', 'Type must be "summary" or "payouts"');
  }
});

/**
 * PUT /api/admin/payouts - Update payout status (admin only)
 */
export const PUT = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { payoutId, status, stripeTransferId, failureReason } = body;

  if (!payoutId || !status) {
    return ApiResponse.error('validation_error', 'payoutId and status are required');
  }

  const validStatuses = ['pending', 'processing', 'completed', 'failed'];
  if (!validStatuses.includes(status)) {
    return ApiResponse.error('validation_error', `Status must be one of: ${validStatuses.join(', ')}`);
  }

  try {
    const updateData: {
      status: string;
      updatedAt: Date;
      processedAt?: Date;
      stripeTransferId?: string;
      failureReason?: string;
    } = {
      status,
      updatedAt: new Date()
    };

    if (status === 'completed') {
      updateData.processedAt = new Date();
    }

    if (stripeTransferId) {
      updateData.stripeTransferId = stripeTransferId;
    }

    if (failureReason) {
      updateData.failureReason = failureReason;
    }

    const payout = await (prisma as any).payout.update({
      where: { id: payoutId },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    });

    return ApiResponse.success({
      payout: {
        ...payout,
        formatted: {
          amount: `$${(payout.amountCents / 100).toFixed(2)}`,
          createdAt: payout.createdAt.toISOString(),
          processedAt: payout.processedAt?.toISOString() || null
        }
      },
      message: 'Payout status updated successfully'
    });

  } catch (error) {
    console.error('Error updating payout status:', error);
    return ApiResponse.error('update_failed', 'Failed to update payout status');
  }
});

