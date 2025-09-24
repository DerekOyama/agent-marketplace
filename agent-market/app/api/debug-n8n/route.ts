import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { webhookUrl } = await req.json();
    
    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 });
    }

    // Test different formats to see what the n8n workflow expects
    const testFormats = [
      { name: "Format 1: { text: 'hello' }", payload: { text: "hello" } },
      { name: "Format 2: { data: { text: 'hello' } }", payload: { data: { text: "hello" } } },
      { name: "Format 3: { message: 'hello' }", payload: { message: "hello" } },
      { name: "Format 4: { input: 'hello' }", payload: { input: "hello" } },
      { name: "Format 5: { body: { text: 'hello' } }", payload: { body: { text: "hello" } } }
    ];

    const results = [];

    for (const test of testFormats) {
      try {
        console.log(`Testing ${test.name}...`);
        
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "User-Agent": "agent-marketplace-debug/1.0"
          },
          body: JSON.stringify({
            ...test.payload,
            source: "agent-marketplace-debug",
            timestamp: new Date().toISOString()
          }),
        });

        if (response.ok) {
          const responseData = await response.json();
          results.push({
            format: test.name,
            payload: test.payload,
            response: responseData,
            success: true
          });
        } else {
          results.push({
            format: test.name,
            payload: test.payload,
            response: null,
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`
          });
        }
      } catch (error) {
        results.push({
          format: test.name,
          payload: test.payload,
          response: null,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return NextResponse.json({
      success: true,
      webhookUrl,
      results
    });

  } catch (error) {
    console.error("Debug n8n error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to debug n8n webhook",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
