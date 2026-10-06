/**
 * AI HEAVEN - Phase 1A Foundation Hook
 * Lightweight hook providing client access to the user session, projects,
 * workspaces, agent droids, tool definitions, and audit events.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import {
  AgentDefinition,
  AuditEvent,
  Project,
  ToolDefinition,
  User,
  Workspace
} from '../types/foundation';
import {
  ExecutionApproval,
  ExecutionJob
} from '../types/execution';

export function useFoundation() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [executions, setExecutions] = useState<ExecutionJob[]>([]);
  const [approvals, setApprovals] = useState<ExecutionApproval[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const reloadFoundation = useCallback(async () => {
    setIsLoading(true);
    try {
      const [user, projs, wss, ags, tls, evts, execs, apprs] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.getProjects(),
        apiClient.getWorkspaces(),
        apiClient.getAgents(),
        apiClient.getTools(),
        apiClient.getAuditEvents(),
        apiClient.getExecutions(),
        apiClient.getApprovals()
      ]);
      setCurrentUser(user);
      setProjects(projs);
      setWorkspaces(wss);
      setAgents(ags);
      setTools(tls);
      setAuditEvents(evts);
      setExecutions(execs);
      setApprovals(apprs);
    } catch (err) {
      console.warn('[AI Heaven Foundation] Failed to load foundation state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadFoundation();
  }, [reloadFoundation]);

  const createProject = async (data: { name: string; description?: string }) => {
    const proj = await apiClient.createProject(data);
    if (proj) {
      setProjects(prev => [...prev, proj]);
    }
    return proj;
  };

  const createWorkspace = async (data: { project_id: string; name: string }) => {
    const ws = await apiClient.createWorkspace(data);
    if (ws) {
      setWorkspaces(prev => [...prev, ws]);
    }
    return ws;
  };

  const createAgent = async (data: {
    project_id: string;
    workspace_id?: string;
    name: string;
    description?: string;
    permissions?: Record<string, unknown>;
  }) => {
    const ag = await apiClient.createAgent(data);
    if (ag) {
      setAgents(prev => [...prev, ag]);
    }
    return ag;
  };

  const submitExecution = async (data: {
    agent_id: string;
    project_id: string;
    workspace_id: string;
    tool_id: string;
    command: string;
  }) => {
    const job = await apiClient.submitExecution(data);
    if (job) {
      setExecutions(prev => [job, ...prev]);
      if (job.approval_id) {
        const updatedApprovals = await apiClient.getApprovals();
        setApprovals(updatedApprovals);
      }
    }
    return job;
  };

  const decideApproval = async (
    approvalId: string,
    decision: 'approved' | 'rejected',
    rejectionReason?: string
  ) => {
    const res = await apiClient.decideApproval(approvalId, decision, rejectionReason);
    if (res) {
      setApprovals(prev => prev.map(a => a.id === approvalId ? res.approval : a));
      setExecutions(prev => prev.map(j => j.id === res.job.id ? res.job : j));
    }
    return res;
  };

  return {
    currentUser,
    projects,
    workspaces,
    agents,
    tools,
    auditEvents,
    executions,
    approvals,
    isLoading,
    reloadFoundation,
    createProject,
    createWorkspace,
    createAgent,
    submitExecution,
    decideApproval
  };
}
