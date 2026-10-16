/**
 * OpenHands Agent Controller (Loop Implementation)
 * Executes iterative Action/Observation cycles grounded in the VFS sandbox.
 */

import crypto from 'crypto';
import {
  OpenHandsAction,
  OpenHandsObservation,
  OpenHandsStepRecord,
  OpenHandsAgentState,
  CmdRunAction,
  FileReadAction,
  FileEditAction,
  AgentFinishAction
} from './types';
import { workspaceFilesystem } from '../../services/sandbox/workspaceFs';
import { terminalExecutionService } from '../../services/terminal/terminalExecutionService';

export class OpenHandsAgentController {
  private state: OpenHandsAgentState;
  private abortController: AbortController | null = null;
  private workspaceId: string;

  constructor(sessionId: string, workspaceRoot: string = 'ws_default_demo', maxIterations: number = 10) {
    this.workspaceId = workspaceRoot.replace(/^\//, '') || 'ws_default_demo';
    this.state = {
      sessionId,
      iteration: 0,
      maxIterations,
      status: 'INIT',
      history: [],
      workspaceRoot: this.workspaceId
    };
  }

  public getState(): OpenHandsAgentState {
    return { ...this.state };
  }

  public abort(): void {
    this.state.status = 'STOPPED';
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  public async executeAction(action: OpenHandsAction): Promise<OpenHandsObservation> {
    const actionId = action.id;
    const now = new Date().toISOString();

    switch (action.action) {
      case 'run': {
        const cmdAction = action as CmdRunAction;
        const result = await terminalExecutionService.executeCommand({
          command: cmdAction.command,
          workspace_id: this.workspaceId
        });

        const outputText = result.stdout || result.stderr || 'Command completed with empty output.';
        return {
          id: `obs_${crypto.randomUUID().slice(0, 8)}`,
          actionId,
          observation: 'run',
          content: outputText,
          exitCode: result.exit_code,
          success: result.exit_code === 0,
          timestamp: now
        };
      }

      case 'read': {
        const readAction = action as FileReadAction;
        try {
          const fileResult = await workspaceFilesystem.readFile(this.workspaceId, readAction.path);
          const lines = fileResult.content.split('\n');
          return {
            id: `obs_${crypto.randomUUID().slice(0, 8)}`,
            actionId,
            observation: 'read',
            path: readAction.path,
            totalLines: lines.length,
            content: fileResult.content,
            success: true,
            timestamp: now
          };
        } catch (err: any) {
          return {
            id: `obs_${crypto.randomUUID().slice(0, 8)}`,
            actionId,
            observation: 'error',
            errorMessage: err.message,
            content: `Error reading file: ${err.message}`,
            success: false,
            timestamp: now
          };
        }
      }

      case 'edit': {
        const editAction = action as FileEditAction;
        try {
          let prevContent = '';
          try {
            const existing = await workspaceFilesystem.readFile(this.workspaceId, editAction.path);
            prevContent = existing.content;
          } catch {
            // New file
          }

          await workspaceFilesystem.writeFile(this.workspaceId, editAction.path, editAction.content);
          return {
            id: `obs_${crypto.randomUUID().slice(0, 8)}`,
            actionId,
            observation: 'edit',
            path: editAction.path,
            diffSummary: `Updated ${editAction.path} (${prevContent.length} bytes -> ${editAction.content.length} bytes)`,
            content: `Successfully modified ${editAction.path}`,
            success: true,
            timestamp: now
          };
        } catch (err: any) {
          return {
            id: `obs_${crypto.randomUUID().slice(0, 8)}`,
            actionId,
            observation: 'error',
            errorMessage: err.message,
            content: `Error modifying file: ${err.message}`,
            success: false,
            timestamp: now
          };
        }
      }

      case 'finish': {
        const finishAction = action as AgentFinishAction;
        this.state.status = 'FINISHED';
        return {
          id: `obs_${crypto.randomUUID().slice(0, 8)}`,
          actionId,
          observation: 'finish',
          content: finishAction.finalThought,
          success: true,
          timestamp: now
        };
      }

      default: {
        return {
          id: `obs_${crypto.randomUUID().slice(0, 8)}`,
          actionId,
          observation: 'error',
          errorMessage: `Unknown action: ${(action as any).action}`,
          content: `Unsupported action type`,
          success: false,
          timestamp: now
        };
      }
    }
  }

  public recordStep(action: OpenHandsAction, observation: OpenHandsObservation, durationMs: number): void {
    this.state.iteration += 1;
    this.state.history.push({
      stepNumber: this.state.iteration,
      action,
      observation,
      durationMs
    });
  }
}
