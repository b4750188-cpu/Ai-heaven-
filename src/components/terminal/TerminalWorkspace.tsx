/**
 * AI HEAVEN - Universal Open-Source Terminal Workspace
 * Interactive sandboxed terminal, project file explorer, in-browser code inspector,
 * quick execution runners, destructive approval boundaries, and AI code assistance.
 */

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Code2,
  CornerDownLeft,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  Folder,
  FolderGit2,
  HardDrive,
  Layers,
  Lock,
  Play,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  StopCircle,
  Terminal,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/apiClient';

interface TerminalOutputLine {
  id: string;
  type: 'command' | 'stdout' | 'stderr' | 'system' | 'approval';
  text: string;
  timestamp: string;
  durationMs?: number;
  exitCode?: number;
}

interface WorkspaceFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size_bytes: number;
  updated_at: string;
}

export const TerminalWorkspace: React.FC = () => {
  const [historyLines, setHistoryLines] = useState<TerminalOutputLine[]>([
    {
      id: 'init_1',
      type: 'system',
      text: 'AI Heaven Isolated Virtual Container Terminal [v2.4.0]\nRuntime Engine: AI Heaven Tenant-Isolated VFS · Security Boundary: Host-Protected',
      timestamp: new Date().toISOString()
    },
    {
      id: 'init_2',
      type: 'system',
      text: 'Type approved shell commands (git, npm, ls, cat, etc.) or select quick runners below.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [cwd, setCwd] = useState<string>('/workspace/ws_default_demo');

  // Approval gate state
  const [pendingApprovalCommand, setPendingApprovalCommand] = useState<string | null>(null);

  // Filesystem Explorer state
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>('README.md');
  const [fileContent, setFileContent] = useState<string>('');
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);
  const [isSavingFile, setIsSavingFile] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Import Repo Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importRepoInput, setImportRepoInput] = useState<string>('google-gemini/cookbook');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWorkspaceFiles();
    loadFileContent('README.md');
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [historyLines]);

  const loadWorkspaceFiles = async () => {
    try {
      const data = await apiClient.getWorkspaceFiles('ws_default_demo');
      setFiles(data);
    } catch (err: any) {
      console.error('Failed to load workspace files:', err);
    }
  };

  const loadFileContent = async (path: string) => {
    setIsFileLoading(true);
    setSelectedFile(path);
    setSaveStatus(null);
    try {
      const file = await apiClient.readWorkspaceFile('ws_default_demo', path);
      setFileContent(file.content || '');
    } catch {
      setFileContent('# Empty or newly initialized file');
    } finally {
      setIsFileLoading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setIsSavingFile(true);
    setSaveStatus(null);
    try {
      await apiClient.writeWorkspaceFile('ws_default_demo', selectedFile, fileContent);
      setSaveStatus('Saved successfully');
      loadWorkspaceFiles();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus('Error saving file');
    } finally {
      setIsSavingFile(false);
    }
  };

  const handleExecute = async (cmdToRun?: string, approved: boolean = false) => {
    const rawCmd = (cmdToRun ?? currentInput).trim();
    if (!rawCmd && !approved) return;

    const cmd = approved ? (pendingApprovalCommand || rawCmd) : rawCmd;
    if (!cmd) return;

    if (!approved) {
      setCurrentInput('');
      setCommandHistory(prev => [cmd, ...prev]);
      setHistoryIndex(-1);
    }

    const commandEntryId = `cmd_${Date.now()}`;
    setHistoryLines(prev => [
      ...prev,
      {
        id: commandEntryId,
        type: 'command',
        text: `developer@aiheaven:${cwd}$ ${cmd}`,
        timestamp: new Date().toISOString()
      }
    ]);

    setIsExecuting(true);
    try {
      const result = await apiClient.executeTerminalCommand({
        command: cmd,
        workspace_id: 'ws_default_demo',
        approved
      });

      setActiveExecutionId(result.execution_id);
      if (result.working_directory) {
        setCwd(result.working_directory);
      }

      if (result.requires_approval) {
        setPendingApprovalCommand(cmd);
        setHistoryLines(prev => [
          ...prev,
          {
            id: `appr_${Date.now()}`,
            type: 'approval',
            text: `[APPROVAL REQUIRED]: ${result.approval_prompt || 'Destructive operation requires human confirmation.'}`,
            timestamp: new Date().toISOString()
          }
        ]);
        return;
      }

      setPendingApprovalCommand(null);

      if (result.stdout) {
        setHistoryLines(prev => [
          ...prev,
          {
            id: `out_${Date.now()}`,
            type: 'stdout',
            text: result.stdout,
            timestamp: new Date().toISOString(),
            durationMs: result.duration_ms,
            exitCode: result.exit_code
          }
        ]);
      }

      if (result.stderr) {
        setHistoryLines(prev => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            type: 'stderr',
            text: result.stderr,
            timestamp: new Date().toISOString(),
            durationMs: result.duration_ms,
            exitCode: result.exit_code
          }
        ]);
      }

      // Refresh files if filesystem changed
      if (
        cmd.startsWith('touch') ||
        cmd.startsWith('mkdir') ||
        cmd.startsWith('rm') ||
        cmd.startsWith('git clone') ||
        cmd.includes('>')
      ) {
        loadWorkspaceFiles();
      }
    } catch (err: any) {
      setHistoryLines(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          type: 'stderr',
          text: `Execution error: ${err.message}`,
          timestamp: new Date().toISOString(),
          exitCode: 1
        }
      ]);
    } finally {
      setIsExecuting(false);
      setActiveExecutionId(null);
      inputRef.current?.focus();
    }
  };

  const handleCancel = async () => {
    if (activeExecutionId) {
      await apiClient.cancelTerminalExecution(activeExecutionId);
      setHistoryLines(prev => [
        ...prev,
        {
          id: `cancel_${Date.now()}`,
          type: 'system',
          text: '^C Process terminated by operator signal (SIGINT).',
          timestamp: new Date().toISOString()
        }
      ]);
      setIsExecuting(false);
      setActiveExecutionId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setCurrentInput(commandHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCurrentInput(commandHistory[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    }
  };

  const handleImportRepo = async () => {
    if (!importRepoInput.includes('/')) return;
    const [owner, repo] = importRepoInput.trim().split('/');
    setIsImporting(true);
    try {
      setHistoryLines(prev => [
        ...prev,
        {
          id: `import_start_${Date.now()}`,
          type: 'system',
          text: `Importing open-source repository ${owner}/${repo} into workspace filesystem...`,
          timestamp: new Date().toISOString()
        }
      ]);

      const res = await apiClient.importRepoToWorkspace(owner, repo, 'ws_default_demo');
      setHistoryLines(prev => [
        ...prev,
        {
          id: `import_end_${Date.now()}`,
          type: 'stdout',
          text: `[OK] Successfully imported ${owner}/${repo} (${res.filesImported} files initialized in tenant VFS).`,
          timestamp: new Date().toISOString(),
          exitCode: 0
        }
      ]);

      loadWorkspaceFiles();
      loadFileContent('README.md');
      setIsImportModalOpen(false);
    } catch (err: any) {
      setHistoryLines(prev => [
        ...prev,
        {
          id: `import_err_${Date.now()}`,
          type: 'stderr',
          text: `Import error: ${err.message}`,
          timestamp: new Date().toISOString(),
          exitCode: 1
        }
      ]);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-slate-100">
      {/* 1. Header Banner */}
      <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
              Isolated Terminal & Workspace Environment
            </h1>
            <p className="text-xs text-slate-400">
              Tenant-isolated virtual container execution · Zero host pollution · Real file trees & Git tools
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="min-h-[44px] px-3.5 py-2 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4 text-blue-400" />
            <span>Import Repository</span>
          </button>

          <span className="text-[11px] font-mono px-2.5 py-1.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>SANDBOX ISOLATED</span>
          </span>
        </div>
      </div>

      {/* 2. Main Workspace Split: Terminal on Left, Files/Editor on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Terminal Console (7 columns on desktop) */}
        <div className="lg:col-span-7 bg-[#0A0D14] border border-slate-800 rounded-xl flex flex-col h-[650px] shadow-2xl overflow-hidden">
          {/* Terminal Titlebar */}
          <div className="px-4 py-3 bg-[#0E131F] border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400 truncate max-w-xs">
                bash — {cwd}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isExecuting && (
                <button
                  onClick={handleCancel}
                  className="px-2 py-1 text-[11px] font-mono rounded bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900/60 flex items-center gap-1"
                >
                  <StopCircle className="h-3 w-3" />
                  <span>Cancel (SIGINT)</span>
                </button>
              )}
              <button
                onClick={() => setHistoryLines([])}
                className="text-[11px] font-mono text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Terminal Output Log */}
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2 select-text">
            {historyLines.map(line => {
              if (line.type === 'command') {
                return (
                  <div key={line.id} className="text-slate-200 font-semibold pt-1">
                    {line.text}
                  </div>
                );
              }
              if (line.type === 'system') {
                return (
                  <div key={line.id} className="text-blue-400/90 italic whitespace-pre-wrap">
                    {line.text}
                  </div>
                );
              }
              if (line.type === 'stderr') {
                return (
                  <div key={line.id} className="text-rose-400 whitespace-pre-wrap">
                    {line.text}
                  </div>
                );
              }
              if (line.type === 'approval') {
                return (
                  <div
                    key={line.id}
                    className="p-3 my-2 bg-amber-950/40 border border-amber-800/80 rounded-lg text-amber-300 space-y-2"
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span>{line.text}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleExecute(undefined, true)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded text-xs transition-colors"
                      >
                        Approve & Execute
                      </button>
                      <button
                        onClick={() => {
                          setPendingApprovalCommand(null);
                          setHistoryLines(prev => [
                            ...prev,
                            {
                              id: `appr_rej_${Date.now()}`,
                              type: 'stderr',
                              text: 'Operator rejected destructive command execution.',
                              timestamp: new Date().toISOString()
                            }
                          ]);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={line.id} className="text-slate-300 whitespace-pre-wrap">
                  {line.text}
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>

          {/* Quick Command Toolbar */}
          <div className="px-3 py-2 bg-[#0E131F]/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">RUN:</span>
            {[
              'git status',
              'ls -la',
              'npm test',
              'npm run build',
              'cat README.md',
              'pwd',
              'ai-explain'
            ].map(quickCmd => (
              <button
                key={quickCmd}
                onClick={() => handleExecute(quickCmd)}
                disabled={isExecuting}
                className="px-2 py-1 text-[11px] font-mono rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0 disabled:opacity-50"
              >
                {quickCmd}
              </button>
            ))}
          </div>

          {/* Terminal Interactive Input Prompt */}
          <div className="p-3 bg-[#080B11] border-t border-slate-800 flex items-center gap-2">
            <span className="font-mono text-emerald-400 text-xs shrink-0 select-none">
              developer@aiheaven:$
            </span>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={e => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              placeholder="Enter command (e.g. ls, git status, npm test)..."
              className="flex-1 bg-transparent font-mono text-xs text-white placeholder-slate-600 focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => handleExecute()}
              disabled={isExecuting || !currentInput.trim()}
              className="min-h-[36px] px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs rounded transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              <CornerDownLeft className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* RIGHT: Workspace File Explorer & Inline Code Inspector (5 columns on desktop) */}
        <div className="lg:col-span-5 bg-[#0A0D14] border border-slate-800 rounded-xl flex flex-col h-[650px] shadow-2xl overflow-hidden">
          {/* File Explorer Header */}
          <div className="px-4 py-3 bg-[#0E131F] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-mono font-semibold text-white">
                Workspace Filesystem
              </span>
            </div>

            <div className="flex items-center gap-2">
              {saveStatus && (
                <span className="text-[11px] font-mono text-emerald-400">{saveStatus}</span>
              )}
              {selectedFile && (
                <button
                  onClick={handleSaveFile}
                  disabled={isSavingFile}
                  className="min-h-[32px] px-2.5 py-1 text-xs font-mono rounded bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Save className="h-3 w-3" />
                  <span>Save</span>
                </button>
              )}
            </div>
          </div>

          {/* Files List Tree */}
          <div className="h-40 overflow-y-auto border-b border-slate-800/80 p-2 space-y-1 bg-slate-950/40">
            {files.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-slate-500">
                No files in workspace. Click "Import Repository" to clone a project.
              </div>
            ) : (
              files.map(file => (
                <button
                  key={file.path}
                  onClick={() => loadFileContent(file.name)}
                  className={`w-full px-2.5 py-1.5 rounded text-left flex items-center justify-between text-xs font-mono transition-colors ${
                    selectedFile === file.name
                      ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {file.type === 'directory' ? (
                      <Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <FileCode className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    )}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {file.size_bytes}B
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Code Viewer / Editor Area */}
          <div className="flex-1 flex flex-col bg-[#080B11] overflow-hidden">
            <div className="px-3 py-1.5 bg-[#0D121F] border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="truncate">{selectedFile || 'Select a file to inspect'}</span>
              <span>UTF-8</span>
            </div>

            {isFileLoading ? (
              <div className="flex-1 flex items-center justify-center text-xs font-mono text-slate-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading file...
              </div>
            ) : (
              <textarea
                value={fileContent}
                onChange={e => setFileContent(e.target.value)}
                className="flex-1 p-3 bg-transparent font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </div>

      {/* 3. Import Repository Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D121F] border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <Download className="h-5 w-5" />
                <h3 className="text-base font-semibold text-white">Import Open-Source Project</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Clones the repository's source tree, README, and dependency manifests directly into your tenant virtual workspace for immediate inspection and execution.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300">REPOSITORY (OWNER/REPO)</label>
              <input
                type="text"
                value={importRepoInput}
                onChange={e => setImportRepoInput(e.target.value)}
                placeholder="google-gemini/cookbook"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Quick Pick Suggestions */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-slate-400">FEATURED REPOSITORIES:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'google-gemini/cookbook',
                  'modelcontextprotocol/servers',
                  'meta-llama/llama3',
                  'langchain-ai/langchain'
                ].map(repoSlug => (
                  <button
                    key={repoSlug}
                    onClick={() => setImportRepoInput(repoSlug)}
                    className="px-2 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {repoSlug}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
                className="min-h-[44px] px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleImportRepo}
                disabled={isImporting || !importRepoInput.trim()}
                className="min-h-[44px] px-4 py-2 text-xs font-mono font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Import to Workspace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
