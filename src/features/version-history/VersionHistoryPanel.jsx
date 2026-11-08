import React, { useState } from 'react';
import { History, Plus, RotateCcw, Clock, CheckCircle2 } from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { flattenNodes } from '../../core/design-schema/operations.js';

export default function VersionHistoryPanel() {
  const {
    activeProjectId,
    versions,
    saveVersionSnapshot,
    restoreVersionSnapshot,
  } = useProjectStore();

  const [versionName, setVersionName] = useState('');
  const [versionNote, setVersionNote] = useState('');
  const [restoredId, setRestoredId] = useState(null);

  const projectVersions = versions.filter((v) => v.projectId === activeProjectId);

  const handleSaveManual = async (e) => {
    e.preventDefault();
    await saveVersionSnapshot({
      name:
        versionName.trim() ||
        `v1.${projectVersions.length + 1} — Manual Checkpoint`,
      note: versionNote.trim() || 'Saved manually from workspace inspector.',
      source: 'Manual Save',
    });
    setVersionName('');
    setVersionNote('');
  };

  const handleRestore = async (verId) => {
    await restoreVersionSnapshot(verId);
    setRestoredId(verId);
    setTimeout(() => setRestoredId(null), 2500);
  };

  return (
    <div className="flex h-full flex-col divide-y divide-border text-xs">
      {/* Manual Save Checkpoint Form */}
      <form onSubmit={handleSaveManual} className="p-3.5 space-y-2.5 bg-panel">
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-accent" />
          <span className="font-semibold text-text-primary">Save Version Snapshot</span>
        </div>

        <input
          type="text"
          value={versionName}
          onChange={(e) => setVersionName(e.target.value)}
          placeholder="Version label (e.g., v1.2 — Refined Sidebar)"
          className="w-full rounded border border-border bg-app px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
        />

        <input
          type="text"
          value={versionNote}
          onChange={(e) => setVersionNote(e.target.value)}
          placeholder="Revision notes (optional)..."
          className="w-full rounded border border-border bg-app px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
        />

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-control bg-accent py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Save Version Snapshot</span>
        </button>
      </form>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-label uppercase tracking-wider text-text-secondary">
            Saved Versions ({projectVersions.length})
          </span>
          <span className="text-meta text-text-muted">Auto-backed up</span>
        </div>

        {projectVersions.length === 0 ? (
          <p className="py-6 text-center text-meta text-text-muted">
            No version snapshots saved yet for this project.
          </p>
        ) : (
          projectVersions.map((ver) => {
            const nodeCount = flattenNodes(ver.schema).length;
            const isJustRestored = restoredId === ver.id;

            return (
              <div
                key={ver.id}
                className="rounded-control border border-border bg-app p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-text-primary">{ver.name}</div>
                    <div className="flex items-center gap-1.5 text-meta text-text-muted mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(ver.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>•</span>
                      <span>{nodeCount} nodes</span>
                    </div>
                  </div>

                  <span
                    className={`rounded border px-1.5 py-0.5 text-meta font-medium shrink-0 ${
                      ver.source === 'Auto-Snapshot'
                        ? 'border-warning/40 bg-warning/10 text-warning'
                        : ver.source === 'Manual Save'
                        ? 'border-accent/40 bg-accent-subtle text-accent'
                        : 'border-border bg-panel text-text-secondary'
                    }`}
                  >
                    {ver.source}
                  </span>
                </div>

                {ver.note && (
                  <p className="text-meta text-text-secondary leading-relaxed">{ver.note}</p>
                )}

                <div className="flex items-center justify-end pt-1 border-t border-border">
                  {isJustRestored ? (
                    <span className="inline-flex items-center gap-1 text-meta font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Restored to Canvas</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRestore(ver.id)}
                      className="inline-flex items-center gap-1 rounded border border-border bg-panel px-2.5 py-1 text-meta font-medium text-text-primary hover:border-accent hover:text-accent"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restore Version</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
