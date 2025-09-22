"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonAgentSchemas = void 0;
exports.validateAgentInput = validateAgentInput;
exports.validateAgentOutput = validateAgentOutput;
// Predefined schemas for common agent types
exports.CommonAgentSchemas = {
    // Text processing agent
    textProcessor: {
        input: {
            type: "object",
            properties: {
                data: {
                    type: "object",
                    properties: {
                        text: { type: "string", description: "Text to process" },
                        operation: {
                            type: "string",
                            description: "Processing operation",
                            enum: ["summarize", "translate", "analyze", "extract"]
                        },
                        language: { type: "string", description: "Target language (for translation)" }
                    }
                }
            },
            required: ["data"],
            additionalProperties: true
        },
        output: {
            type: "object",
            properties: {
                success: { type: "boolean" },
                data: {
                    type: "object",
                    properties: {
                        result: { type: "string", description: "Processed text result" },
                        confidence: { type: "number", description: "Confidence score 0-1" }
                    }
                },
                metadata: {
                    type: "object",
                    properties: {
                        executionId: { type: "string" },
                        timestamp: { type: "string" },
                        duration: { type: "number" }
                    }
                }
            },
            required: ["success", "data", "metadata"],
            additionalProperties: true
        }
    },
    // Data analysis agent
    dataAnalyzer: {
        input: {
            type: "object",
            properties: {
                data: {
                    type: "object",
                    properties: {
                        dataset: { type: "array", description: "Data to analyze" },
                        analysisType: {
                            type: "string",
                            description: "Type of analysis",
                            enum: ["statistical", "trend", "correlation", "prediction"]
                        }
                    }
                }
            },
            required: ["data"],
            additionalProperties: true
        },
        output: {
            type: "object",
            properties: {
                success: { type: "boolean" },
                data: {
                    type: "object",
                    properties: {
                        results: { type: "object", description: "Analysis results" },
                        visualizations: { type: "array", description: "Chart data" },
                        insights: { type: "array", description: "Key insights" }
                    }
                },
                metadata: {
                    type: "object",
                    properties: {
                        executionId: { type: "string" },
                        timestamp: { type: "string" },
                        duration: { type: "number" }
                    }
                }
            },
            required: ["success", "data", "metadata"],
            additionalProperties: true
        }
    },
    // Web scraper agent
    webScraper: {
        input: {
            type: "object",
            properties: {
                data: {
                    type: "object",
                    properties: {
                        url: { type: "string", description: "URL to scrape" },
                        selectors: { type: "object", description: "CSS selectors for data extraction" },
                        options: {
                            type: "object",
                            description: "Scraping options",
                            properties: {
                                waitTime: { type: "number" },
                                userAgent: { type: "string" }
                            }
                        }
                    }
                }
            },
            required: ["data"],
            additionalProperties: true
        },
        output: {
            type: "object",
            properties: {
                success: { type: "boolean" },
                data: {
                    type: "object",
                    properties: {
                        scrapedData: { type: "object", description: "Extracted data" },
                        pageInfo: {
                            type: "object",
                            description: "Page metadata",
                            properties: {
                                title: { type: "string" },
                                url: { type: "string" },
                                timestamp: { type: "string" }
                            }
                        }
                    }
                },
                metadata: {
                    type: "object",
                    properties: {
                        executionId: { type: "string" },
                        timestamp: { type: "string" },
                        duration: { type: "number" }
                    }
                }
            },
            required: ["success", "data", "metadata"],
            additionalProperties: true
        }
    },
    // Generic webhook agent (for n8n compatibility)
    webhook: {
        input: {
            type: "object",
            properties: {
                data: { type: "object", description: "Flexible input data" }
            },
            required: ["data"],
            additionalProperties: true
        },
        output: {
            type: "object",
            properties: {
                success: { type: "boolean" },
                data: { type: "object", description: "Flexible output data" },
                metadata: {
                    type: "object",
                    properties: {
                        executionId: { type: "string" },
                        timestamp: { type: "string" },
                        duration: { type: "number" }
                    }
                }
            },
            required: ["success", "data", "metadata"],
            additionalProperties: true
        }
    }
};
// Helper function to validate JSON against schema
function validateAgentInput(input, schema) {
    // Basic validation - in production, use a proper JSON schema validator like ajv
    if (!input || typeof input !== 'object') {
        return { valid: false, errors: ['Input must be an object'] };
    }
    var obj = input;
    var errors = [];
    // Check required fields
    for (var _i = 0, _a = schema.required; _i < _a.length; _i++) {
        var field = _a[_i];
        if (!(field in obj)) {
            errors.push("Missing required field: ".concat(field));
        }
    }
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}
function validateAgentOutput(output, schema) {
    // Basic validation - in production, use a proper JSON schema validator like ajv
    if (!output || typeof output !== 'object') {
        return { valid: false, errors: ['Output must be an object'] };
    }
    var obj = output;
    var errors = [];
    // Check required fields
    for (var _i = 0, _a = schema.required; _i < _a.length; _i++) {
        var field = _a[_i];
        if (!(field in obj)) {
            errors.push("Missing required field: ".concat(field));
        }
    }
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}
