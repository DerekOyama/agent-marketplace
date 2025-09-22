import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(req: NextRequest) {
  try {
    console.log('Agents API called');
    
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' },
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
    
    console.log('Found agents:', agents.length);
    
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json({ 
      error: "Database error", 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
