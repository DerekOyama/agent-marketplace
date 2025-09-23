import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { CommonAgentSchemas } from "../../../../../types/agent-schemas";
import { Prisma } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    
    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Get agent with input/output schemas
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        inputSchema: true,
        outputSchema: true,
        metadata: true,
        pricing: true,
        pricePerExecutionCents: true,
        stats: true,
        isActive: true,
        triggerType: true,
        webhookUrl: true,
        n8nWorkflowId: true,
        n8nInstanceUrl: true,
      } as Prisma.AgentSelect
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    if (!agent.isActive) {
      return NextResponse.json(
        { error: "Agent is not active" },
        { status: 403 }
      );
    }

      // If agent doesn't have schemas, try to infer from type
      let inputSchema = (agent as { inputSchema?: unknown }).inputSchema;
      let outputSchema = (agent as { outputSchema?: unknown }).outputSchema;

      if (!inputSchema || !outputSchema) {
        // Try to get default schema based on agent type or metadata
        const metadata = agent.metadata as Record<string, unknown>;
      
      // Check if metadata has category information
      const category = metadata?.category || 'webhook';
      
      // Map to common schemas
      if (category === 'text-processing' || category === 'textProcessor') {
        inputSchema = CommonAgentSchemas.textProcessor.input as unknown as Prisma.JsonValue;
        outputSchema = CommonAgentSchemas.textProcessor.output as unknown as Prisma.JsonValue;
      } else if (category === 'data-analysis' || category === 'dataAnalyzer') {
        inputSchema = CommonAgentSchemas.dataAnalyzer.input as unknown as Prisma.JsonValue;
        outputSchema = CommonAgentSchemas.dataAnalyzer.output as unknown as Prisma.JsonValue;
      } else if (category === 'web-scraping' || category === 'webScraper') {
        inputSchema = CommonAgentSchemas.webScraper.input as unknown as Prisma.JsonValue;
        outputSchema = CommonAgentSchemas.webScraper.output as unknown as Prisma.JsonValue;
      } else {
        // Default to webhook schema for n8n agents or unknown types
        inputSchema = CommonAgentSchemas.webhook.input as unknown as Prisma.JsonValue;
        outputSchema = CommonAgentSchemas.webhook.output as unknown as Prisma.JsonValue;
      }
    }

    // Generate example input based on schema
    const exampleInput = generateExampleInput(inputSchema as Record<string, unknown> | null);
    
    // Generate documentation
    const documentation = {
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        type: agent.type,
        triggerType: agent.triggerType,
        isActive: agent.isActive,
        pricing: agent.pricing,
        pricePerExecutionCents: agent.pricePerExecutionCents,
        stats: agent.stats,
      },
      input: {
        schema: inputSchema as Record<string, unknown>,
        example: exampleInput,
        description: getInputDescription(inputSchema as Record<string, unknown> | null),
        requiredFields: getRequiredFields(inputSchema as Record<string, unknown> | null),
      },
      output: {
        schema: outputSchema as Record<string, unknown>,
        description: getOutputDescription(outputSchema as Record<string, unknown> | null),
        example: generateExampleOutput(outputSchema as Record<string, unknown> | null),
      },
      usage: {
        endpoint: `/api/execute`,
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: {
          agentId: agent.id,
          data: exampleInput.data || exampleInput
        }
      }
    };

    return NextResponse.json({
      success: true,
      documentation
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching agent requirements:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: String((error as Error)?.message || error)
      },
      { status: 500 }
    );
  }
}

function generateExampleInput(schema: Record<string, unknown> | null): Record<string, unknown> {
  if (!schema || !schema.properties) {
    return { data: { text: "Hello from the agent marketplace!" } };
  }

  // Special handling for webhook agents - they expect data.text format
  const props = schema.properties as Record<string, unknown>;
  if (props.text && !props.data) {
    return { data: { text: "Hello from the agent marketplace!" } };
  }

  const example: Record<string, unknown> = {};
  
  for (const [key, prop] of Object.entries(schema.properties as Record<string, unknown>)) {
    const propObj = prop as Record<string, unknown>;
    if (propObj.type === 'string') {
      if (propObj.enum && Array.isArray(propObj.enum) && propObj.enum.length > 0) {
        example[key] = propObj.enum[0];
      } else if (key.toLowerCase().includes('url')) {
        example[key] = "https://example.com";
      } else if (key.toLowerCase().includes('text')) {
        example[key] = "Hello from the agent marketplace!";
      } else if (key.toLowerCase().includes('message')) {
        example[key] = "Hello from the agent marketplace!";
      } else {
        example[key] = `sample_${key}`;
      }
    } else if (propObj.type === 'number') {
      example[key] = (propObj.minimum as number) || 0;
    } else if (propObj.type === 'boolean') {
      example[key] = false;
    } else if (propObj.type === 'array') {
      example[key] = [];
    } else if (propObj.type === 'object') {
      example[key] = generateExampleInput(propObj as Record<string, unknown>);
    }
  }

  return example;
}

function generateExampleOutput(schema: Record<string, unknown> | null): Record<string, unknown> {
  if (!schema || !schema.properties) {
    return {
      success: true,
      data: { result: "Operation completed successfully" },
      metadata: {
        executionId: "exec_123456789",
        timestamp: new Date().toISOString(),
        duration: 1500
      }
    };
  }

  const example: Record<string, unknown> = {};
  
  for (const [key, prop] of Object.entries(schema.properties as Record<string, unknown>)) {
    const propObj = prop as Record<string, unknown>;
    if (key === 'success') {
      example[key] = true;
    } else if (key === 'data') {
      example[key] = { result: "Processing completed" };
    } else if (key === 'metadata') {
      example[key] = {
        executionId: "exec_123456789",
        timestamp: new Date().toISOString(),
        duration: 1500
      };
    } else if (propObj.type === 'string') {
      example[key] = `sample_${key}`;
    } else if (propObj.type === 'number') {
      example[key] = 100;
    } else if (propObj.type === 'boolean') {
      example[key] = true;
    } else if (propObj.type === 'array') {
      example[key] = [];
    } else if (propObj.type === 'object') {
      example[key] = generateExampleOutput(propObj as Record<string, unknown>);
    }
  }

  return example;
}

function getInputDescription(schema: Record<string, unknown> | null): string {
  if (!schema) {
    return "Send your input data in the 'data' field with a 'text' property for processing.";
  }

  // Special handling for webhook agents
  const props = schema.properties as Record<string, unknown>;
  if (props.text && !props.data) {
    return "Send your input data in the 'data' field with a 'text' property for processing.";
  }

  if (schema && schema.properties && typeof schema.properties === 'object' && schema.properties !== null && 'data' in schema.properties) {
    const dataProps = (schema.properties.data as Record<string, unknown>).properties as Record<string, unknown> || {};
    const propNames = Object.keys(dataProps);
    
    if (propNames.length > 0) {
      return `Input requires a 'data' object with the following fields: ${propNames.join(', ')}. Include a 'text' field with your input.`;
    }
  }

  return "Send your input data in the 'data' field of the request body. Include a 'text' field with your input.";
}

function getOutputDescription(schema: Record<string, unknown> | null): string {
  if (!schema) {
    return "Standard output format with success status, data, and metadata.";
  }

  const props = (schema.properties as Record<string, unknown>) || {};
  const hasSuccess = 'success' in props;
  const hasData = 'data' in props;
  const hasMetadata = 'metadata' in props;

  const parts = [];
  if (hasSuccess) parts.push("success status");
  if (hasData) parts.push("result data");
  if (hasMetadata) parts.push("execution metadata");

  return `Output includes: ${parts.join(', ')}.`;
}

function getRequiredFields(schema: Record<string, unknown> | null): string[] {
  if (!schema || !schema.required) {
    return ['data'];
  }

  return schema.required as string[];
}
