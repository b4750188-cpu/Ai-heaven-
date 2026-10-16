/**
 * OpenHands Software Agent SDK Types & Protocol Contracts
 * Based on OpenHands (https://github.com/OpenHands/software-agent-sdk)
 * Attribution: OpenHands Project (MIT License)
 */

export type OpenHandsActionType =
  | 'run'
  | 'read'
  | 'edit'
  | 'browse'
  | 'message'
  | 'finish'
  | 'reject';

export interface BaseAction {
  id: string;
  action: OpenHandsActionType;
  thought?: string;
  timestamp: string;
}

export interface CmdRunAction extends BaseAction {
  action: 'run';
  command: string;
  isBackground?: boolean;
}

export interface FileReadAction extends BaseAction {
  action: 'read';
  path: string;
  startLine?: number;
  endLine?: number;
}

export interface FileEditAction extends BaseAction {
  action: 'edit';
  path: string;
  content: string;
  oldContent?: string;
}

export interface BrowseAction extends BaseAction {
  action: 'browse';
  url: string;
}

export interface AgentFinishAction extends BaseAction {
  action: 'finish';
  finalThought: string;
  outputs?: Record<string, any>;
}

export type OpenHandsAction =
  | CmdRunAction
  | FileReadAction
  | FileEditAction
  | BrowseAction
  | AgentFinishAction;

export interface BaseObservation {
  id: string;
  actionId: string;
  observation: string;
  content: string;
  timestamp: string;
  success: boolean;
}

export interface CmdOutputObservation extends BaseObservation {
  observation: 'run';
  exitCode: number;
}

export interface FileReadObservation extends BaseObservation {
  observation: 'read';
  path: string;
  totalLines: number;
}

export interface FileEditObservation extends BaseObservation {
  observation: 'edit';
  path: string;
  diffSummary: string;
}

export interface AgentFinishObservation extends BaseObservation {
  observation: 'finish';
}

export interface ErrorObservation extends BaseObservation {
  observation: 'error';
  errorMessage: string;
}

export type OpenHandsObservation =
  | CmdOutputObservation
  | FileReadObservation
  | FileEditObservation
  | AgentFinishObservation
  | ErrorObservation;

export interface OpenHandsStepRecord {
  stepNumber: number;
  action: OpenHandsAction;
  observation: OpenHandsObservation;
  durationMs: number;
}

export interface OpenHandsAgentState {
  sessionId: string;
  iteration: number;
  maxIterations: number;
  status: 'INIT' | 'RUNNING' | 'AWAITING_INPUT' | 'FINISHED' | 'ERROR' | 'STOPPED';
  history: OpenHandsStepRecord[];
  workspaceRoot: string;
}
