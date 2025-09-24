import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log('Webhook test API called');
    const body = await req.json();
    console.log('Request body:', body);
    
    const { webhookUrl, testData } = body;

    if (!webhookUrl) {
      console.log('No webhook URL provided');
      return NextResponse.json(
        { error: "Webhook URL is required" },
        { status: 400 }
      );
    }

    console.log('Testing webhook:', webhookUrl);
    console.log('Test data:', testData);

    // Prepare the test payload
    const testPayload = testData ? {
      ...testData,
      source: "agent-marketplace",
      timestamp: new Date().toISOString()
    } : {
      test: true,
      source: "agent-marketplace",
      timestamp: new Date().toISOString()
    };

    console.log('Sending test payload to n8n:', JSON.stringify(testPayload, null, 2));

    // Test the webhook from the server side to avoid CORS issues
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "n8n-agent-marketplace/1.0"
      },
      body: JSON.stringify(testPayload),
    });

    console.log('Webhook response status:', response.status);
    console.log('Webhook response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const responseData = await response.text();
      console.log('Webhook response data (raw):', responseData);
      console.log('Webhook response data length:', responseData.length);
      
      // Try to parse as JSON, fallback to text
      let output;
      try {
        output = JSON.parse(responseData);
        console.log('Parsed JSON output:', output);
      } catch (parseError) {
        console.log('Failed to parse as JSON, using raw text:', parseError);
        output = responseData;
      }
      
      return NextResponse.json({
        success: true,
        status: response.status,
        statusText: response.statusText,
        output: output,
        rawResponse: responseData, // Include raw response for debugging
        responseType: typeof output,
        isEmpty: !responseData || responseData.trim() === '',
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

