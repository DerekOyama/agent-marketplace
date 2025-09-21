import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log('Webhook test API called');
    const body = await req.json();
    console.log('Request body:', body);
    
    const { webhookUrl } = body;

    if (!webhookUrl) {
      console.log('No webhook URL provided');
      return NextResponse.json(
        { error: "Webhook URL is required" },
        { status: 400 }
      );
    }

    console.log('Testing webhook:', webhookUrl);

    // Test the webhook from the server side to avoid CORS issues
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "n8n-agent-marketplace/1.0"
      },
      body: JSON.stringify({ 
        test: true,
        source: "agent-marketplace",
        timestamp: new Date().toISOString()
      }),
    });

    console.log('Webhook response status:', response.status);
    console.log('Webhook response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const responseData = await response.text();
      console.log('Webhook response data:', responseData);
      
      return NextResponse.json({
        success: true,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        message: "Webhook test successful"
      });
    } else {
      const errorData = await response.text();
      console.log('Webhook error data:', errorData);
      
      return NextResponse.json({
        success: false,
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        message: `Webhook test failed: ${response.status} ${response.statusText}`
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to test webhook",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
