import { NextRequest } from "next/server";
import { ApiResponse, withAuth } from "../../../../../lib/api-utils";
import { prisma } from "../../../../../lib/prisma";

/**
 * GET /api/agents/mine/revenue - Get current user's agents with revenue data
 */
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Get user's agents with their execution data
    const agents = await prisma.agent.findMany({
      where: {
        ownerId: userId,
        isDeleted: false
      },
      include: {
        executions: {
          select: {
            id: true,
            creditsConsumed: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate revenue data for each agent
    const agentsWithRevenue = agents.map((agent: any) => {
      const successfulExecutions = agent.executions.filter((exec: any) => exec.status === 'success');
      const totalExecutions = successfulExecutions.length;
      const totalRevenueCents = successfulExecutions.reduce((sum: number, exec: any) => sum + exec.creditsConsumed, 0);
      
      // Calculate platform fee (10%) and creator earnings (90%)
      const platformFeeCents = Math.floor((totalRevenueCents * 10) / 100);
      const creatorEarningsCents = totalRevenueCents - platformFeeCents;
      
      const lastExecutionAt = successfulExecutions.length > 0 
        ? successfulExecutions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
        : null;

      return {
        id: agent.id,
        name: agent.name,
        description: agent.description || 'No description',
        totalExecutions,
        totalRevenueCents,
        platformFeeCents,
        creatorEarningsCents,
        lastExecutionAt,
        isActive: agent.isActive,
        formatted: {
          totalRevenue: `$${(totalRevenueCents / 100).toFixed(2)}`,
          platformFee: `$${(platformFeeCents / 100).toFixed(2)}`,
          creatorEarnings: `$${(creatorEarningsCents / 100).toFixed(2)}`,
          lastExecutionAt: lastExecutionAt ? new Date(lastExecutionAt).toISOString() : null
        }
      };
    });

    return ApiResponse.success({
      agents: agentsWithRevenue
    });

  } catch (error) {
    console.error('Error fetching user agents revenue:', error);
    return ApiResponse.error('Failed to fetch agents revenue data');
  }
});
