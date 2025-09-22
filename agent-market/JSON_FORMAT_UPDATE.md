# Agent JSON Input/Output Format Update

## Overview

All agents in the marketplace have been updated to use a standardized JSON input/output format. This ensures consistency, better error handling, and improved integration capabilities across all agent types.

## 🚀 What's Changed

### 1. Database Schema Updates

**New fields added to Agent model:**
- `inputSchema` (Json?) - JSON schema for input validation
- `outputSchema` (Json?) - JSON schema for output validation

### 2. Standardized Input Format

All agents now expect input in the following standardized format:

```typescript
interface StandardAgentInput {
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
```

**Example:**
```json
{
  "data": {
    "text": "Hello, world! This is a sample text for processing.",
    "operation": "summarize"
  },
  "metadata": {
    "requestId": "req_1758500505330_abc123",
    "userId": "demo-user",
    "timestamp": "2025-09-22T00:21:45.330Z",
    "version": "1.0.0"
  },
  "config": {
    "timeout": 30000,
    "retries": 3
  }
}
```

### 3. Standardized Output Format

All agents now return output in the following standardized format:

```typescript
interface StandardAgentOutput {
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
  };
}
```

**Success Example:**
```json
{
  "success": true,
  "data": {
    "result": "Hello, world! This is a sample...",
    "confidence": 0.95,
    "wordCount": 50
  },
  "metadata": {
    "executionId": "exec_1758500505331_xyz789",
    "timestamp": "2025-09-22T00:21:45.331Z",
    "duration": 1250,
    "version": "1.0.0"
  },
  "usage": {
    "tokensUsed": 150,
    "creditsConsumed": 25,
    "apiCalls": 1
  }
}
```

**Error Example:**
```json
{
  "success": false,
  "data": {},
  "metadata": {
    "executionId": "error_1758500505332_err456",
    "timestamp": "2025-09-22T00:21:45.332Z",
    "duration": 500
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": {
      "field": "operation",
      "expectedValues": ["summarize", "translate", "analyze"]
    }
  }
}
```

## 📋 Predefined Agent Schemas

### 1. Text Processor Agent
- **Purpose**: AI-powered text processing (summarization, translation, analysis)
- **Input**: `{ text: string, operation: "summarize" | "translate" | "analyze" | "extract", language?: string }`
- **Output**: `{ result: string, confidence: number }`

### 2. Data Analyzer Agent
- **Purpose**: Statistical analysis, trend detection, and predictions
- **Input**: `{ dataset: array, analysisType: "statistical" | "trend" | "correlation" | "prediction" }`
- **Output**: `{ results: object, visualizations: array, insights: array }`

### 3. Web Scraper Agent
- **Purpose**: Intelligent web scraping with CSS selector support
- **Input**: `{ url: string, selectors: object, options?: object }`
- **Output**: `{ scrapedData: object, pageInfo: object }`

### 4. Generic Webhook Agent
- **Purpose**: N8n compatibility and flexible webhook processing
- **Input**: `{ data: object }` (flexible)
- **Output**: `{ data: object }` (flexible)

## 🔧 API Endpoints Updated

### 1. N8n Execution Endpoint (`/api/n8n/execute`)
- ✅ Now sends standardized input format to webhooks
- ✅ Converts legacy responses to standardized output format
- ✅ Enhanced error handling with structured error responses
- ✅ Input validation using agent schemas
- ✅ Execution tracking and metadata

### 2. Transaction Dispatch Endpoint (`/api/transactions/[id]/dispatch`)
- ✅ Uses standardized input format for agent communication
- ✅ Handles both legacy and standardized agent responses
- ✅ Enhanced logging with execution IDs
- ✅ Improved error reporting

### 3. Agent Registration Endpoints
- ✅ N8n webhook registration includes default schemas
- ✅ Agent discovery includes schema definitions
- ✅ All new agents get appropriate input/output schemas

### 4. Agents List Endpoint (`/api/agents`)
- ✅ Now includes `inputSchema` and `outputSchema` fields
- ✅ Agents indicate their JSON format compatibility

## 🧪 Testing

### Test Results
```
🧪 Testing JSON input/output format for agents...

📊 Summary:
   • 4 predefined agent schemas available
   • All agents use StandardAgentInput format
   • All agents use StandardAgentOutput format
   • Input/output validation functions working
   • Error handling standardized
   • Backward compatibility maintained
```

### Running Tests
```bash
# Compile and run the JSON format test
npx tsc scripts/test-json-format-simple.ts --outDir ./dist --moduleResolution node --esModuleInterop
node dist/scripts/test-json-format-simple.js
```

## 🔄 Backward Compatibility

The system maintains backward compatibility:

1. **Legacy Agent Support**: Agents that don't return the standardized format are automatically converted
2. **Flexible Input**: The `data` field can contain any structure needed by specific agents
3. **Optional Schemas**: Agents without schemas still work, just without validation
4. **Gradual Migration**: Existing agents can be updated incrementally

## 📁 Files Modified

### Core Type Definitions
- `types/agent-schemas.ts` - New comprehensive schema definitions

### Database Schema
- `prisma/schema.prisma` - Added `inputSchema` and `outputSchema` fields

### API Endpoints
- `app/api/n8n/execute/route.ts` - Standardized JSON I/O
- `app/api/transactions/[id]/dispatch/route.ts` - Standardized JSON I/O
- `app/api/n8n/register-webhook/route.ts` - Schema integration
- `app/api/agents/route.ts` - Include schema fields

### Scripts
- `scripts/seed-agent.ts` - Updated with 4 demo agents with schemas
- `scripts/test-json-format-simple.ts` - Comprehensive testing

## 🚀 Next Steps

1. **Database Migration**: Run `npx prisma db push` to apply schema changes
2. **Seed Agents**: Run `npm run db:seed` to create demo agents with schemas  
3. **Test Integration**: Test agent execution with the new JSON format
4. **Update Documentation**: Update any external documentation or SDKs

## 💡 Benefits

1. **Consistency**: All agents use the same input/output structure
2. **Validation**: Input validation prevents errors and improves reliability
3. **Tracking**: Comprehensive execution tracking and metadata
4. **Error Handling**: Structured error responses for better debugging
5. **Usage Analytics**: Built-in usage tracking for credits and tokens
6. **Scalability**: Standardized format makes it easier to add new agent types
7. **Integration**: Easier to integrate with external systems and SDKs

## 🔍 Schema Validation

The system includes validation functions:
- `validateAgentInput(input, schema)` - Validates input against agent schema
- `validateAgentOutput(output, schema)` - Validates output against agent schema

These functions provide basic validation and can be extended with full JSON Schema validators like AJV for production use.
