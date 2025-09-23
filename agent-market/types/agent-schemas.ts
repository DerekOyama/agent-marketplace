// JSON schemas for agent input/output validation
export interface AgentInputSchema {
  type: "object";
  properties: Record<string, {
    type: "string" | "number" | "boolean" | "object" | "array";
    description?: string;
    required?: boolean;
    enum?: string[] | number[];
    minimum?: number;
    maximum?: number;
    items?: {
      type: "string" | "number" | "boolean" | "object";
      properties?: Record<string, unknown>;
    };
  }>;
  required: string[];
  additionalProperties?: boolean;
}

export interface AgentOutputSchema {
  type: "object";
  properties: Record<string, {
    type: "string" | "number" | "boolean" | "object" | "array";
    description?: string;
  }>;
  required: string[];
  additionalProperties?: boolean;
}

// Standard input format for all agents
export interface StandardAgentInput {
  // Core execution data
  data: Record<string, unknown>;
  
  // Optional metadata
  metadata?: {
    requestId?: string;
    userId?: string;
    timestamp?: string;
    version?: string;
  };
  
  // Configuration overrides
  config?: {
    timeout?: number;
    retries?: number;
    [key: string]: unknown;
  };
}

// Standard output format for all agents
export interface StandardAgentOutput {
  // Execution status
  success: boolean;
  
  // Result data
  data: Record<string, unknown>;
  
  // Execution metadata
  metadata: {
    executionId: string;
    timestamp: string;
    duration: number;
    version?: string;
    agentId?: string;
    webhookUrl?: string;
    responseSize?: number;
    contentType?: string;
    [key: string]: unknown; // Allow additional metadata fields
  };
  
  // Error information (if success is false)
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  
  // Usage statistics
  usage?: {
    tokensUsed?: number;
    creditsConsumed?: number;
    apiCalls?: number;
    remainingCredits?: number;
    executionCostCents?: number;
    httpStatus?: number;
    httpStatusText?: string;
    [key: string]: unknown; // Allow additional usage fields
  };
}

// Predefined schemas for common agent types
export const CommonAgentSchemas = {
  // Text processing agent
  textProcessor: {
    input: {
      type: "object" as const,
      properties: {
        data: {
          type: "object" as const,
          properties: {
            text: { type: "string" as const, description: "Text to process" },
            operation: { 
              type: "string" as const, 
              description: "Processing operation",
              enum: ["summarize", "translate", "analyze", "extract"]
            },
            language: { type: "string" as const, description: "Target language (for translation)" }
          }
        }
      },
      required: ["data"],
      additionalProperties: true
    } as AgentInputSchema,
    output: {
      type: "object" as const,
      properties: {
        success: { type: "boolean" as const },
        data: {
          type: "object" as const,
          properties: {
            result: { type: "string" as const, description: "Processed text result" },
            confidence: { type: "number" as const, description: "Confidence score 0-1" }
          }
        },
        metadata: {
          type: "object" as const,
          properties: {
            executionId: { type: "string" as const },
            timestamp: { type: "string" as const },
            duration: { type: "number" as const }
          }
        }
      },
      required: ["success", "data", "metadata"],
      additionalProperties: true
    } as AgentOutputSchema
  },

  // Data analysis agent
  dataAnalyzer: {
    input: {
      type: "object" as const,
      properties: {
        data: {
          type: "object" as const,
          properties: {
            dataset: { type: "array" as const, description: "Data to analyze" },
            analysisType: { 
              type: "string" as const, 
              description: "Type of analysis",
              enum: ["statistical", "trend", "correlation", "prediction"]
            }
          }
        }
      },
      required: ["data"],
      additionalProperties: true
    } as AgentInputSchema,
    output: {
      type: "object" as const,
      properties: {
        success: { type: "boolean" as const },
        data: {
          type: "object" as const,
          properties: {
            results: { type: "object" as const, description: "Analysis results" },
            visualizations: { type: "array" as const, description: "Chart data" },
            insights: { type: "array" as const, description: "Key insights" }
          }
        },
        metadata: {
          type: "object" as const,
          properties: {
            executionId: { type: "string" as const },
            timestamp: { type: "string" as const },
            duration: { type: "number" as const }
          }
        }
      },
      required: ["success", "data", "metadata"],
      additionalProperties: true
    } as AgentOutputSchema
  },

  // Web scraper agent
  webScraper: {
    input: {
      type: "object" as const,
      properties: {
        data: {
          type: "object" as const,
          properties: {
            url: { type: "string" as const, description: "URL to scrape" },
            selectors: { type: "object" as const, description: "CSS selectors for data extraction" },
            options: { 
              type: "object" as const, 
              description: "Scraping options",
              properties: {
                waitTime: { type: "number" as const },
                userAgent: { type: "string" as const }
              }
            }
          }
        }
      },
      required: ["data"],
      additionalProperties: true
    } as AgentInputSchema,
    output: {
      type: "object" as const,
      properties: {
        success: { type: "boolean" as const },
        data: {
          type: "object" as const,
          properties: {
            scrapedData: { type: "object" as const, description: "Extracted data" },
            pageInfo: { 
              type: "object" as const, 
              description: "Page metadata",
              properties: {
                title: { type: "string" as const },
                url: { type: "string" as const },
                timestamp: { type: "string" as const }
              }
            }
          }
        },
        metadata: {
          type: "object" as const,
          properties: {
            executionId: { type: "string" as const },
            timestamp: { type: "string" as const },
            duration: { type: "number" as const }
          }
        }
      },
      required: ["success", "data", "metadata"],
      additionalProperties: true
    } as AgentOutputSchema
  },

  // Generic webhook agent (for n8n compatibility)
  webhook: {
    input: {
      type: "object" as const,
      properties: {
        text: { 
          type: "string" as const, 
          description: "Text input for processing"
        }
      },
      required: ["text"],
      additionalProperties: true
    } as AgentInputSchema,
    output: {
      type: "object" as const,
      properties: {
        success: { type: "boolean" as const },
        data: { type: "object" as const, description: "Flexible output data" },
        metadata: {
          type: "object" as const,
          properties: {
            executionId: { type: "string" as const },
            timestamp: { type: "string" as const },
            duration: { type: "number" as const }
          }
        }
      },
      required: ["success", "data", "metadata"],
      additionalProperties: true
    } as AgentOutputSchema
  }
};

// Helper function to validate JSON against schema
export function validateAgentInput(input: unknown, schema: AgentInputSchema): { valid: boolean; errors?: string[] } {
  // Basic validation - in production, use a proper JSON schema validator like ajv
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const obj = input as Record<string, unknown>;
  const errors: string[] = [];

  // Check required fields
  for (const field of schema.required) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

export function validateAgentOutput(output: unknown, schema: AgentOutputSchema): { valid: boolean; errors?: string[] } {
  // Basic validation - in production, use a proper JSON schema validator like ajv
  if (!output || typeof output !== 'object') {
    return { valid: false, errors: ['Output must be an object'] };
  }

  const obj = output as Record<string, unknown>;
  const errors: string[] = [];

  // Check required fields
  for (const field of schema.required) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}
