import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { N8nService } from "@/lib/n8n";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { instanceUrl, apiKey, name } = await req.json();

    console.log('N8n Instance API Request:', { instanceUrl, apiKey: apiKey ? '***' : 'missing', name });

    if (!instanceUrl) {
      console.log('Missing required fields:', { instanceUrl: !!instanceUrl, apiKey: !!apiKey });
      return NextResponse.json(
        { error: "Instance URL is required" },
        { status: 400 }
      );
    }

    // Test connection to n8n instance
    console.log('Testing connection to:', instanceUrl);
    const n8nService = new N8nService(instanceUrl, apiKey);
    const isConnected = await n8nService.testConnection();

    console.log('Connection test result:', isConnected);

    if (!isConnected) {
      return NextResponse.json(
        { error: "Cannot connect to n8n instance. Please check URL and API key." },
        { status: 400 }
      );
    }

    // Get basic instance info
    const workflows = await n8nService.getWorkflows();
    const activeWorkflows = workflows.filter(w => w.active);

    return NextResponse.json({
      success: true,
      instance: {
        url: instanceUrl,
        name: name || `N8n Instance (${instanceUrl})`,
        totalWorkflows: workflows.length,
        activeWorkflows: activeWorkflows.length,
        workflows: workflows.map(w => ({
          id: w.id,
          name: w.name,
          active: w.active,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
        })),
      },
    });

  } catch (error) {
    console.error("N8n instance test error:", error);
    return NextResponse.json(
      { 
        error: "Failed to connect to n8n instance",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

