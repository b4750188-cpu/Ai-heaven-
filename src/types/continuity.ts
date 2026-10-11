/**
 * AI HEAVEN - Continuity & Intelligence Engine Formal Type Contracts
 * Preserves verified engineering knowledge, records measurable outcomes,
 * and enables safe task resurrection across sessions and projects.
 */

export type EvidenceStatus = 'VERIFIED' | 'INFERRED' | 'UNVERIFIED' | 'OUTDATED';

export type MemoryCategory =
  | 'architecture'
  | 'solution'
  | 'failure_pattern'
  | 'test_technique'
  | 'constraint';

export type MemorySourceType =
  | 'test_execution'
  | 'audit_receipt'
  | 'human_correction'
  | 'code_review'
  | 'model_inferred';

export interface EvidencePayload {
  testsPassed?: number;
  testsFailed?: number;
  testsTotal?: number;
  receiptId?: string;
  exitCode?: number;
  executionOutput?: string;
  verifiedAt?: string;
  verificationTool?: string;
}

export interface MemoryAuditRecord {
  timestamp: string;
  action: 'created' | 'status_changed' | 'revalidated' | 'corrected' | 'promoted_global' | 'demoted';
  previousStatus?: EvidenceStatus;
  newStatus?: EvidenceStatus;
  reason?: string;
  actor?: string;
}

export interface EngineeringMemory {
  id: string;
  tenantId: string;
  projectId: string | null; // null if global approved
  projectName?: string;
  title: string;
  domain: string;
  category: MemoryCategory;
  content: string;
  tags: string[];
  evidenceStatus: EvidenceStatus;
  confidenceScore: number; // 0.0 to 1.0
  sourceType: MemorySourceType;
  sourceReference: string;
  isGlobalApproved: boolean;
  evidencePayload?: EvidencePayload;
  influencingTasks: string[];
  updateHistory: MemoryAuditRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskOutcome {
  id: string;
  taskId: string;
  projectId: string;
  modelUsed: string;
  durationMs: number;
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  reliabilityScore: number; // 0.0 to 1.0
  tokensUsed: number;
  costEstimate: number;
  costSource: 'reported_by_provider_metadata' | 'catalog_estimated';
  regressionsDetected: number;
  resumedFromCheckpoint?: string;
  timestamp: string;
}

export interface TaskResurrectionPlan {
  taskId: string;
  checkpointId: string;
  checkpointTitle: string;
  projectId: string;
  totalActions: number;
  completedActions: number;
  remainingActions: number;
  canResume: boolean;
  completedActionIndices: number[];
  nextActionIndex: number;
  existingReceipts: string[];
  safeResumeSteps: string[];
  influencingMemories: EngineeringMemory[];
}

export interface ResurrectionExecutionResult {
  success: boolean;
  taskId: string;
  checkpointId: string;
  resumedFromStep: number;
  actionsExecuted: number;
  actionsSkippedIdempotent: number;
  finalStatus: 'completed' | 'in_progress' | 'failed';
  outcome: TaskOutcome;
  evidenceReceiptId: string;
}

export interface ModelImprovementTrend {
  modelId: string;
  sampleCount: number;
  avgReliability: number;
  avgLatencyMs: number;
  testPassRatePct: number;
  lastUpdated: string;
  sufficientEvidence: boolean; // requires >= 3 trials to avoid overfitting
}

export interface ContinuityDashboardData {
  activeProjects: Array<{
    id: string;
    name: string;
    memoryCount: number;
    lastCheckpoint?: string;
    unverifiedCount: number;
  }>;
  lastVerifiedCheckpoints: Array<{
    id: string;
    taskId: string;
    title: string;
    stepIndex: number;
    createdAt: string;
  }>;
  resumableTasks: Array<{
    id: string;
    goal: string;
    projectId: string;
    status: string;
    completedSteps: number;
    totalSteps: number;
    lastCheckpointId?: string;
  }>;
  knownBlockers: EngineeringMemory[];
  reusableVerifiedSolutions: EngineeringMemory[];
  staleOrConflictingKnowledge: Array<{
    memory: EngineeringMemory;
    reason: string;
    conflictingMemoryId?: string;
  }>;
  improvementTrends: ModelImprovementTrend[];
}
