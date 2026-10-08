import {
  FolderGit2,
  HardDrive,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import React, { useState } from 'react';
import { Project, Workspace } from '../../types/foundation';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface ProjectsViewProps {
  projects: Project[];
  workspaces: Workspace[];
  onCreateProject?: (name: string, description: string) => Promise<void>;
  onCreateWorkspace?: (projectId: string, name: string) => Promise<void>;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  workspaces,
  onCreateProject,
  onCreateWorkspace
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects.length > 0 ? projects[0].id : ''
  );
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];
  const projectWorkspaces = workspaces.filter(
    w => !selectedProjectId || w.project_id === selectedProjectId
  );

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !onCreateProject) return;
    setIsSubmitting(true);
    try {
      await onCreateProject(projectName.trim(), projectDesc.trim());
      setIsNewProjectModalOpen(false);
      setProjectName('');
      setProjectDesc('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-150">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span>PLATFORM</span>
            <span className="text-slate-600">/</span>
            <span>PROJECTS & WORKSPACES</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-100 font-mono tracking-tight">
            Tenant Project Isolation
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Logical project isolation boundaries and sandboxed workspace filesystems for autonomous execution.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setIsNewProjectModalOpen(true)}
        >
          New Project
        </Button>
      </div>

      {/* Main Grid: Projects List + Workspaces Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
            Projects ({projects.length})
          </div>

          <div className="space-y-2">
            {projects.map(proj => {
              const isSelected = proj.id === selectedProjectId;
              const count = workspaces.filter(w => w.project_id === proj.id).length;

              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500/50 bg-blue-950/20 text-slate-100'
                      : 'border-slate-800/80 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="font-semibold text-slate-100">{proj.name}</span>
                    <Badge variant={isSelected ? 'info' : 'neutral'} size="xs">
                      {proj.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {proj.description || 'Tenant isolated engineering workspace.'}
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800/60">
                    <span>ID: {proj.id}</span>
                    <span>{count} workspace{count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Workspaces Table (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold uppercase tracking-wider text-slate-400">
              Sandboxed Workspaces ({projectWorkspaces.length})
            </span>
            {selectedProject && (
              <span className="text-slate-500">
                Project: <strong className="text-slate-300">{selectedProject.name}</strong>
              </span>
            )}
          </div>

          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-500">
                    <th className="py-2.5 px-4 font-medium">Workspace Name</th>
                    <th className="py-2.5 px-4 font-medium">Filesystem Reference</th>
                    <th className="py-2.5 px-4 font-medium">Isolation Status</th>
                    <th className="py-2.5 px-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {projectWorkspaces.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No workspaces found for this project.
                      </td>
                    </tr>
                  ) : (
                    projectWorkspaces.map(ws => (
                      <tr key={ws.id} className="hover:bg-slate-850/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200 font-sans">{ws.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{ws.id}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <div className="flex items-center gap-1.5 text-blue-400/90 font-mono text-[11px]">
                            <HardDrive className="h-3 w-3 text-slate-500 shrink-0" />
                            <span>{ws.filesystem_ref}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="success" size="xs" dot>
                            {ws.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(ws.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: New Project */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0B0F19] p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 font-mono">Create Isolated Project</h3>
            <form onSubmit={handleCreateProjectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Project Name:</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="e.g., Core Engine Workspace"
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium block mb-1">Description:</label>
                <textarea
                  value={projectDesc}
                  onChange={e => setProjectDesc(e.target.value)}
                  placeholder="Autonomous pipeline testing and deployment sandbox"
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="secondary" size="xs" onClick={() => setIsNewProjectModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="xs" type="submit" isLoading={isSubmitting}>
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
