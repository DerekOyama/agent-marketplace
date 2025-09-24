import { N8nWorkflow, N8nExecution, N8nAgent } from '../types/n8n';

export class N8nService {
  private baseUrl: string;
  private apiKey: string;

  constructor(instanceUrl: string, apiKey: string = '') {
    this.baseUrl = instanceUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private validateApiKey(): boolean {
    if (!this.apiKey || this.apiKey === 'test' || this.apiKey.trim() === '') {
      return false;
    }
    return true;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Try both API v1 and v2 endpoints for n8n Cloud compatibility
    const urls = [
      `${this.baseUrl}/api/v1${endpoint}`,
      `${this.baseUrl}/api/v2${endpoint}`,
      `${this.baseUrl}/api${endpoint}`
    ];
    
    let lastError: Error | null = null;
    
    for (const url of urls) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Add headers from options if provided
        if (options.headers) {
          if (options.headers instanceof Headers) {
            options.headers.forEach((value, key) => {
              headers[key] = value;
            });
          } else {
            Object.assign(headers, options.headers);
          }
        }
        
        // Only add API key header if we have a valid one
        if (this.apiKey && this.apiKey !== 'test' && this.apiKey.trim() !== '') {
          headers['X-N8N-API-KEY'] = this.apiKey;
        }
        
        console.log('N8n API Request:', {
          url,
          method: options.method || 'GET',
          hasApiKey: !!headers['X-N8N-API-KEY']
        });
        
        const response = await fetch(url, {
          ...options,
          headers,
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        console.log('N8n API Response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('N8n API Error Response:', errorText);
          lastError = new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
          continue; // Try next URL
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error(`Failed to connect to ${url}:`, error);
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = new Error('Request timeout - n8n instance may be slow or unreachable');
          } else if (error.message.includes('fetch')) {
            lastError = new Error(`Network error: ${error.message}`);
          } else {
            lastError = error;
          }
        } else {
          lastError = new Error('Unknown network error');
        }
        
        continue; // Try next URL
      }
    }
    
    throw lastError || new Error('All API endpoints failed');
  }

  async getWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await this.makeRequest<{ data: N8nWorkflow[] }>('/workflows');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new Error('Invalid API key. Please check your n8n API key and try again.');
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          throw new Error('Access denied. Please check your n8n API key permissions.');
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          throw new Error('n8n instance not found. Please check the instance URL.');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          throw new Error('Cannot connect to n8n instance. Please check the instance URL and ensure it\'s running.');
        } else if (error.message.includes('timeout')) {
          throw new Error('Connection timeout. Please check your network connection and try again.');
        }
      }
      
      throw new Error(`Failed to fetch n8n workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    try {
      return await this.makeRequest<N8nWorkflow>(`/workflows/${id}`);
    } catch (error) {
      console.error(`Failed to fetch workflow ${id}:`, error);
      throw new Error(`Failed to fetch workflow ${id}`);
    }
  }

  async executeWorkflow(id: string, inputData?: Record<string, unknown>): Promise<N8nExecution> {
    try {
      const response = await this.makeRequest<N8nExecution>('/executions', {
        method: 'POST',
        body: JSON.stringify({
          workflowId: id,
          data: inputData,
        }),
      });
      return response;
    } catch (error) {
      console.error(`Failed to execute workflow ${id}:`, error);
      throw new Error(`Failed to execute workflow ${id}`);
    }
  }

  async getExecution(id: string): Promise<N8nExecution> {
    try {
      return await this.makeRequest<N8nExecution>(`/executions/${id}`);
    } catch (error) {
      console.error(`Failed to fetch execution ${id}:`, error);
      throw new Error(`Failed to fetch execution ${id}`);
    }
  }

  async getExecutions(workflowId?: string, limit = 20): Promise<N8nExecution[]> {
    try {
      const params = new URLSearchParams();
      if (workflowId) params.append('workflowId', workflowId);
      params.append('limit', limit.toString());
      
      const response = await this.makeRequest<{ data: N8nExecution[] }>(`/executions?${params}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch executions:', error);
      throw new Error('Failed to fetch executions');
    }
  }

  async createWebhook(workflowId: string, path: string): Promise<{ webhookUrl: string }> {
    try {
      // This would typically involve creating a webhook trigger node
      // For now, we'll return a constructed webhook URL
      const webhookUrl = `${this.baseUrl}/webhook/${path}`;
      return { webhookUrl };
    } catch (error) {
      console.error(`Failed to create webhook for workflow ${workflowId}:`, error);
      throw new Error(`Failed to create webhook for workflow ${workflowId}`);
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Try different endpoints that might work with n8n Cloud
      const endpoints = [
        '/workflows?limit=1',
        '/workflows',
        '/health',
        '/status',
        '/me',
        '/user/profile'
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          await this.makeRequest(endpoint);
          console.log(`Success with endpoint: ${endpoint}`);
          return { success: true };
        } catch (error) {
          console.log(`Failed with endpoint ${endpoint}:`, error);
          // If we get a 401/403, it means the API key is invalid but the connection works
          if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
            console.log('API key authentication failed, but connection successful');
            return { success: true, error: 'Connection successful but API key may be invalid' };
          }
          continue;
        }
      }
      
      // If all REST endpoints fail, try a simple GET to the base URL
      console.log('Trying base URL test...');
      const response = await fetch(this.baseUrl, {
        headers: {
          'X-N8N-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('Base URL test successful');
        return { success: true };
      }
      
      return { success: false, error: 'Cannot connect to n8n instance' };
    } catch (error) {
      console.error('N8n connection test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }

  // Convert n8n workflow to marketplace agent
  convertWorkflowToAgent(workflow: N8nWorkflow, instanceUrl: string): Partial<N8nAgent> {
    const triggerNode = workflow.nodes.find(node => 
      node.type === 'n8n-nodes-base.webhook' || 
      node.type === 'n8n-nodes-base.scheduleTrigger' ||
      node.type === 'n8n-nodes-base.manualTrigger'
    );

    const triggerType = triggerNode?.type === 'n8n-nodes-base.webhook' ? 'webhook' :
                       triggerNode?.type === 'n8n-nodes-base.scheduleTrigger' ? 'schedule' : 'manual';

    // Generate a more descriptive description based on workflow nodes
    const nodeTypes = workflow.nodes.map(node => node.type).filter(type => 
      !type.includes('trigger') && !type.includes('webhook')
    );
    const description = this.generateWorkflowDescription(workflow, nodeTypes);

    return {
      name: workflow.name,
      description,
      n8nWorkflowId: workflow.id,
      n8nInstanceUrl: instanceUrl,
      webhookUrl: triggerType === 'webhook' ? `${instanceUrl}/webhook/${workflow.id}` : undefined,
      triggerType,
      isActive: workflow.active,
      metadata: {
        category: 'n8n-workflow',
        tags: workflow.tags || [],
        version: workflow.versionId || '1.0.0',
        author: 'n8n',
        documentation: `${instanceUrl}/workflow/${workflow.id}`,
        nodeTypes: nodeTypes.slice(0, 5), // Limit to first 5 node types for metadata
      },
      pricing: {
        pricePerExecution: 0.01, // Default pricing
        currency: 'USD',
        freeExecutions: 100,
      },
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
      },
    };
  }

  // Generate a more descriptive description for workflows
  private generateWorkflowDescription(workflow: N8nWorkflow, nodeTypes: string[]): string {
    const baseDescription = `N8n workflow: ${workflow.name}`;
    
    if (nodeTypes.length === 0) {
      return baseDescription;
    }

    // Create a more informative description based on node types
    const commonNodes = nodeTypes.slice(0, 3).map(type => {
      const cleanType = type.replace('n8n-nodes-base.', '').replace('n8n-nodes-base.', '');
      return cleanType.charAt(0).toUpperCase() + cleanType.slice(1);
    });

    if (commonNodes.length === 1) {
      return `${workflow.name} - Automated ${commonNodes[0]} workflow`;
    } else if (commonNodes.length === 2) {
      return `${workflow.name} - ${commonNodes[0]} and ${commonNodes[1]} automation`;
    } else {
      return `${workflow.name} - Multi-step automation using ${commonNodes.join(', ')} and more`;
    }
  }
}

// Utility function to discover and register n8n workflows
export async function discoverN8nWorkflows(instanceUrl: string, apiKey: string) {
  const n8nService = new N8nService(instanceUrl, apiKey);
  
  try {
    // Test connection first
    const connectionResult = await n8nService.testConnection();
    if (!connectionResult.success) {
      throw new Error(connectionResult.error || 'Cannot connect to n8n instance');
    }

    // Get all workflows
    const workflows = await n8nService.getWorkflows();
    
    // Convert to agents
    const agents = workflows.map(workflow => 
      n8nService.convertWorkflowToAgent(workflow, instanceUrl)
    );

    return {
      success: true,
      agents,
      totalWorkflows: workflows.length,
    };
  } catch (error) {
    console.error('Failed to discover n8n workflows:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      agents: [],
      totalWorkflows: 0,
    };
  }
}

