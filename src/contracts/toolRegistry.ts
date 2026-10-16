/**
 * AI HEAVEN - Unified Capability & Tool Registry Contracts
 * Part 4/10 Integration: Model Context Protocol (MCP), Playwright, browser-use, Stagehand, OpenSandbox
 */

export type ToolCategory =
  | 'browser_automation'
  | 'sandbox_execution'
  | 'mcp_server'
  | 'code_analysis'
  | 'security_audit'
  | 'memory_search'
  | 'system_utility';

export type ToolPermissionLevel = 'read_only' | 'sandbox_isolated' | 'network_restricted' | 'human_approval_required';

export interface ToolParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  enum?: string[];
}

export interface UnifiedToolDefinition {
  id: string;
  name: string;
  version: string;
  category: ToolCategory;
  description: string;
  upstreamUrl: string;
  upstreamLicense: string;
  permissionLevel: ToolPermissionLevel;
  timeoutMs: number;
  isEnabled: boolean;
  requiresHumanApproval: boolean;
  parameters: Record<string, ToolParameterSchema>;
  returns: {
    type: string;
    description: string;
  };
  metrics: {
    invocations: number;
    successes: number;
    failures: number;
    avgDurationMs: number;
    lastInvokedAt?: string;
  };
}

export interface ToolInvocationContext {
  taskId?: string;
  agentId?: string;
  tenantId?: string;
  userId?: string;
  approvedByUser?: boolean;
  dryRun?: boolean;
}

export interface ToolInvocationResult {
  toolId: string;
  invocationId: string;
  success: boolean;
  status: 'completed' | 'failed' | 'timed_out' | 'approval_rejected' | 'permission_denied';
  output: any;
  rawOutput?: string;
  durationMs: number;
  error?: string;
  receiptHash: string; // SHA-256 execution receipt
  executedAt: string;
}

export interface IUnifiedToolAdapter {
  definition: UnifiedToolDefinition;
  execute(params: Record<string, any>, context: ToolInvocationContext): Promise<ToolInvocationResult>;
  cancel(invocationId: string): Promise<boolean>;
}
