export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: N8nConnection;
  settings?: N8nWorkflowSettings;
  staticData?: any;
  tags?: string[];
  versionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
  webhookId?: string;
  disabled?: boolean;
  notes?: string;
  executeOnce?: boolean;
  alwaysOutputData?: boolean;
  onError?: string;
  continueOnFail?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
}

export interface N8nConnection {
  [nodeId: string]: {
    [outputIndex: string]: Array<{
      node: string;
      type: string;
      index: number;
    }>;
  };
}

export interface N8nWorkflowSettings {
  executionOrder: 'v1' | 'v2';
  saveManualExecutions: boolean;
  callersPolicy: 'workflowsFromSameOwner' | 'workflowsFromSameOwnerAndUsers' | 'allUsers';
  errorWorkflow?: string;
  timezone?: string;
  executionTimeout?: number;
  maxExecutionTimeout?: number;
  saveDataErrorExecution: 'all' | 'none';
  saveDataSuccessExecution: 'all' | 'none';
  saveManualExecutions: boolean;
  includeInExecutionLog: boolean;
  retryOnFail: boolean;
  maxRetries: number;
  retryDelay: number;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: 'manual' | 'trigger';
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  data: N8nExecutionData;
  status: 'running' | 'success' | 'error' | 'crashed' | 'waiting';
  error?: N8nExecutionError;
}

export interface N8nExecutionData {
  resultData: {
    runData: Record<string, N8nNodeRunData[]>;
    lastNodeExecuted: string;
    executionTime: number;
    error?: N8nExecutionError;
  };
}

export interface N8nNodeRunData {
  startTime: number;
  executionTime: number;
  data: {
    main: Array<Record<string, any>>;
  };
  error?: N8nExecutionError;
}

export interface N8nExecutionError {
  message: string;
  stack?: string;
  name?: string;
  code?: string;
}

export interface N8nAgent {
  id: string;
  name: string;
  description?: string;
  n8nWorkflowId: string;
  n8nInstanceUrl: string;
  webhookUrl?: string;
  triggerType: 'webhook' | 'manual' | 'schedule';
  isActive: boolean;
  metadata: {
    category?: string;
    tags?: string[];
    version?: string;
    author?: string;
    documentation?: string;
  };
  pricing: {
    pricePerExecution: number;
    currency: string;
    freeExecutions?: number;
  };
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecuted?: string;
  };
  createdAt: string;
  updatedAt: string;
}

