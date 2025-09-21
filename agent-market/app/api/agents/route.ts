import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  try {
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
        createdAt: true,
        updatedAt: true
      }
    });
    return NextResponse.json({ agents }, { status: 200 });
  } catch (e: any) {
    console.error("Database error:", e);
    return NextResponse.json({ 
      agents: [], 
      error: "db_error", 
      message: String(e?.message || e) 
    }, { status: 500 });
  }
}
