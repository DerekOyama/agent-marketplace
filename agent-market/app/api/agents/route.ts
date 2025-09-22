import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prisma";
import { wrapApi, createSuccessResponse } from "../../../lib/api-wrapper";

async function handler(_req: NextRequest, _context: { params: Promise<Record<string, string>> }) {
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'desc' }, // Newest first
    select: { 
      id: true, 
      name: true, 
      description: true,
      runUrl: true,
      quoteUrl: true,
      token: true,
      type: true,
      n8nWorkflowId: true,
      n8nInstanceUrl: true,
      webhookUrl: true,
      triggerType: true,
      isActive: true,
      metadata: true,
      pricing: true,
      stats: true,
      inputSchema: true,
      outputSchema: true,
      createdAt: true,
      updatedAt: true
    }
  });
  
  return createSuccessResponse({ agents });
}

export const GET = wrapApi(handler);
