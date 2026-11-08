import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Layers,
  Copy,
  Trash2,
  Edit3,
  Bot,
  Clock,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Code2,
} from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { useAgentStore } from '../../stores/useAgentStore.js';
import { useReferenceStore } from '../../stores/useReferenceStore.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    projects,
    activeProjectId,
    activities,
    selectProject,
    duplicateProject,
    deleteProject,
    renameProject,
  } = useProjectStore();
  const { agents, activeAgentId, bridgeStatus } = useAgentStore();
  const { references } = useReferenceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const activeAgent = agents.find((a) => a.id === activeAgentId) || agents[0];

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.platform || '').toLowerCase().includes(q)
    );
  });

  const handleOpenProject = async (projectId) => {
    await selectProject(projectId);
    navigate('/workspace');
  };

  const handleStartRename = (project) => {
    setRenamingId(project.id);
    setRenameValue(project.name);
  };

  const handleSaveRename = async (projectId) => {
    if (renameValue.trim()) {
      await renameProject(projectId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const getPlatformIcon = (platform) => {
    if (platform === 'Mobile') return <Smartphone className="h-3.5 w-3.5 text-text-secondary" />;
    if (platform === 'Tablet') return <Tablet className="h-3.5 w-3.5 text-text-secondary" />;
    return <Monitor className="h-3.5 w-3.5 text-text-secondary" />;
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      {/* Top Bar: Title & Primary Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-page-title text-text-primary">Workspace Overview</h1>
          <p className="mt-1 text-secondary text-text-secondary">
            Create structured UI designs in Layora Design Schema, refine layouts, and copy editable layers to Figma.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/projects/new?mode=source-code')}
            className="flex items-center gap-2 rounded-control border border-border bg-panel px-3.5 py-2 text-btn text-text-primary hover:bg-panel-muted transition-colors"
          >
            <Code2 className="h-4 w-4 text-text-secondary" />
            <span>Source Code to Design</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/projects/new')}
            className="flex items-center gap-2 rounded-control bg-accent px-4 py-2 text-btn text-white hover:bg-accent-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Main Split: Recent Projects (Left 2/3) + Agent Status & Activity (Right 1/3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-panel-title text-text-primary">
              Projects ({filteredProjects.length})
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                aria-label="Search projects"
                className="w-full rounded-control border border-border bg-panel pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="rounded-panel border border-border bg-panel p-8 text-center">
              <p className="text-body font-medium text-text-primary">
                {searchQuery ? 'No matching projects found' : 'No projects created yet'}
              </p>
              <p className="mt-1 text-secondary text-text-secondary max-w-md mx-auto">
                {searchQuery
                  ? 'Try clearing your search filter or create a new design project.'
                  : 'Start from a product prompt with references, or reconstruct an existing codebase into editable Layora schema nodes.'}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/projects/new')}
                  className="inline-flex items-center gap-1.5 rounded-control bg-accent px-3.5 py-2 text-btn text-white hover:bg-accent-hover"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create First Project</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredProjects.map((project) => {
                const isSelected = project.id === activeProjectId;
                const projectRefsCount = references.filter((r) => r.projectId === project.id).length;

                return (
                  <div
                    key={project.id}
                    className={`group flex flex-col justify-between rounded-panel border bg-panel transition-colors ${
                      isSelected ? 'border-accent' : 'border-border hover:border-text-muted'
                    }`}
                  >
                    {/* Minimal Structural Wireframe Thumbnail */}
                    <div
                      onClick={() => handleOpenProject(project.id)}
                      className="cursor-pointer border-b border-border bg-panel-muted p-4 h-32 flex items-center justify-center relative overflow-hidden"
                    >
                      {project.platform === 'Mobile' ? (
                        <div className="w-20 h-24 rounded border border-border bg-panel p-2 flex flex-col gap-1.5 shadow-sm">
                          <div className="h-2 w-10 rounded-sm bg-text-muted/40" />
                          <div className="h-7 w-full rounded-sm bg-accent/80" />
                          <div className="grid grid-cols-3 gap-1">
                            <div className="h-3 rounded-sm bg-border" />
                            <div className="h-3 rounded-sm bg-border" />
                            <div className="h-3 rounded-sm bg-border" />
                          </div>
                          <div className="h-2.5 w-full rounded-sm bg-border/70" />
                        </div>
                      ) : (
                        <div className="w-44 h-24 rounded border border-border bg-panel flex overflow-hidden shadow-sm">
                          <div className="w-10 bg-slate-900 p-1.5 flex flex-col gap-1">
                            <div className="h-2 w-5 rounded-sm bg-accent" />
                            <div className="h-1.5 w-full rounded-sm bg-slate-700 mt-1" />
                            <div className="h-1.5 w-full rounded-sm bg-slate-700" />
                            <div className="h-1.5 w-4/5 rounded-sm bg-slate-700" />
                          </div>
                          <div className="flex-1 p-2 flex flex-col gap-1.5 bg-slate-50">
                            <div className="flex justify-between items-center">
                              <div className="h-2 w-16 rounded-sm bg-slate-400" />
                              <div className="h-2.5 w-8 rounded-sm bg-accent" />
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="h-6 rounded-sm bg-white border border-slate-200" />
                              <div className="h-6 rounded-sm bg-white border border-slate-200" />
                              <div className="h-6 rounded-sm bg-white border border-slate-200" />
                            </div>
                            <div className="flex-1 rounded-sm bg-white border border-slate-200" />
                          </div>
                        </div>
                      )}

                      <span className="absolute right-2.5 top-2.5 rounded border border-border bg-panel px-2 py-0.5 text-meta text-text-secondary">
                        {project.generationMode === 'source-code' ? 'Source to Design' : 'From Scratch'}
                      </span>
                    </div>

                    {/* Project Info & Actions */}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        {renamingId === project.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(project.id);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="w-full rounded border border-accent bg-panel px-2 py-1 text-xs font-semibold text-text-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(project.id)}
                              className="rounded bg-accent px-2 py-1 text-xs text-white"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenProject(project.id)}
                              className="text-left font-semibold text-body text-text-primary hover:text-accent transition-colors"
                            >
                              {project.name}
                            </button>
                            <div className="flex items-center gap-1">
                              {getPlatformIcon(project.platform)}
                              <span className="text-meta text-text-muted">
                                {project.viewport?.width}×{project.viewport?.height}
                              </span>
                            </div>
                          </div>
                        )}

                        {project.description && (
                          <p className="mt-1 text-secondary text-text-secondary line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-3">
                        <div className="flex items-center gap-2 text-meta text-text-muted">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(project.updatedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span>•</span>
                          <span>{projectRefsCount} ref(s)</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenProject(project.id)}
                            title="Open in Workspace"
                            className="inline-flex items-center gap-1 rounded border border-border bg-panel-muted px-2 py-1 text-meta font-medium text-text-primary hover:border-accent hover:text-accent"
                          >
                            <span>Open</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartRename(project)}
                            title="Rename Project"
                            aria-label={`Rename ${project.name}`}
                            className="p-1 text-text-secondary hover:text-text-primary rounded hover:bg-panel-muted"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => duplicateProject(project.id)}
                            title="Duplicate Project"
                            aria-label={`Duplicate ${project.name}`}
                            className="p-1 text-text-secondary hover:text-text-primary rounded hover:bg-panel-muted"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          {confirmDeleteId === project.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                deleteProject(project.id);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded bg-danger px-2 py-0.5 text-meta text-white"
                            >
                              Confirm Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(project.id)}
                              title="Delete Project"
                              aria-label={`Delete ${project.name}`}
                              className="p-1 text-text-secondary hover:text-danger rounded hover:bg-panel-muted"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Compact Agent Status & Recent Activity */}
        <div className="space-y-5">
          {/* Agent Connection Status Panel */}
          <div className="rounded-panel border border-border bg-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-accent" />
                <h2 className="text-panel-title text-text-primary">AI Execution Status</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/agents')}
                className="text-xs font-medium text-accent hover:underline"
              >
                Configure
              </button>
            </div>

            <div className="rounded-control border border-border bg-panel-muted p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">
                  {activeAgent?.name}
                </span>
                <span className="inline-flex items-center gap-1 text-meta font-medium text-text-secondary">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      activeAgent?.status === 'connected' || activeAgent?.status === 'handoff-ready'
                        ? 'bg-success'
                        : 'bg-warning'
                    }`}
                  />
                  {activeAgent?.status === 'connected'
                    ? 'Connected'
                    : activeAgent?.status === 'handoff-ready'
                    ? 'Handoff Ready'
                    : 'Not Connected'}
                </span>
              </div>

              <div className="text-meta text-text-secondary">
                Mode:{' '}
                <strong className="font-medium text-text-primary uppercase">
                  {activeAgent?.executionMode}
                </strong>{' '}
                • Model: <span className="font-mono">{activeAgent?.model}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border text-meta text-text-muted">
                <span>Local Bridge Service</span>
                <span className={bridgeStatus.online ? 'text-success font-medium' : 'text-text-muted'}>
                  {bridgeStatus.online ? 'Online (127.0.0.1:3001)' : 'Standby'}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity Log */}
          <div className="rounded-panel border border-border bg-panel p-4 space-y-3">
            <h2 className="text-panel-title text-text-primary">Recent Activity</h2>
            {activities.length === 0 ? (
              <p className="text-secondary text-text-muted">No recent tasks recorded.</p>
            ) : (
              <div className="divide-y divide-border">
                {activities.slice(0, 6).map((act) => (
                  <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-text-primary truncate">
                        {act.projectName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-meta text-text-secondary shrink-0">
                        {act.status === 'Completed' ? (
                          <CheckCircle2 className="h-3 w-3 text-success" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-warning" />
                        )}
                        {act.status}
                      </span>
                    </div>
                    <p className="text-meta text-text-secondary">{act.action}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
