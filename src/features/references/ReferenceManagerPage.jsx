import React, { useState } from 'react';
import {
  Plus,
  Search,
  Image as ImageIcon,
  Globe,
  FileCode2,
  Palette,
  Layout,
  Trash2,
  Edit3,
  Eye,
  Paperclip,
  Upload,
  X,
} from 'lucide-react';
import { useReferenceStore, REFERENCE_TYPES } from '../../stores/useReferenceStore.js';
import { useProjectStore } from '../../stores/useProjectStore.js';

export default function ReferenceManagerPage() {
  const {
    references,
    addReference,
    updateReference,
    deleteReference,
    toggleReferenceTaskAttachment,
  } = useReferenceStore();
  const { projects, activeProjectId } = useProjectStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [previewRef, setPreviewRef] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState('');

  // New Reference Form State
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('visual');
  const [newProjectId, setNewProjectId] = useState(activeProjectId || 'proj_vortex_cloud');
  const [newSource, setNewSource] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newPreviewUrl, setNewPreviewUrl] = useState('');

  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!newName.trim()) {
      setNewName(file.name.replace(/\.[^.]+$/, ''));
    }
    setNewSource(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateReference = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await addReference({
      name: newName.trim(),
      type: newType,
      projectId: newProjectId,
      source: newSource.trim() || (newType === 'website' ? 'https://example.com' : 'Local Reference Asset'),
      previewUrl:
        newPreviewUrl.trim() ||
        (newType === 'visual' && newSource.startsWith('http') ? newSource.trim() : null),
      notes: newNotes.trim(),
      attachedToTask: true,
    });
    setNewName('');
    setNewSource('');
    setNewNotes('');
    setNewPreviewUrl('');
    setShowAddForm(false);
  };

  const filteredRefs = references.filter((ref) => {
    if (typeFilter !== 'all' && ref.type !== typeFilter) return false;
    if (projectFilter !== 'all' && ref.projectId !== projectFilter) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      ref.name.toLowerCase().includes(q) ||
      (ref.notes || '').toLowerCase().includes(q) ||
      (ref.source || '').toLowerCase().includes(q)
    );
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'visual':
        return <ImageIcon className="h-4 w-4 text-accent" />;
      case 'website':
        return <Globe className="h-4 w-4 text-accent" />;
      case 'brand':
        return <Palette className="h-4 w-4 text-accent" />;
      case 'source':
        return <FileCode2 className="h-4 w-4 text-accent" />;
      default:
        return <Layout className="h-4 w-4 text-accent" />;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-page-title text-text-primary">Reference Manager</h1>
          <p className="mt-1 text-secondary text-text-secondary">
            Organize screenshots, URLs, component specs, brand assets, and source references used as generation context.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2 text-btn text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          <span>Add Reference</span>
        </button>
      </div>

      {/* Add Reference Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateReference}
          className="rounded-panel border border-accent bg-panel p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-panel-title text-text-primary">New Reference Material</h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-text-secondary hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-label text-text-primary mb-1">Reference Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Stripe Checkout Table Pattern"
                className="w-full rounded-control border border-border bg-app px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-label text-text-primary mb-1">Reference Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full rounded-control border border-border bg-app px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
              >
                {REFERENCE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-label text-text-primary mb-1">Project Scope</label>
              <select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="w-full rounded-control border border-border bg-app px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-label text-text-primary mb-1">
                Source URL / File Identifier
              </label>
              <input
                type="text"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="https://... or file specification"
                className="w-full rounded-control border border-border bg-app px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-label text-text-primary mb-1">
                Upload Image / Screenshot (Optional)
              </label>
              <label className="flex items-center gap-2 rounded-control border border-dashed border-border bg-app px-3 py-1.5 text-xs text-text-secondary cursor-pointer hover:border-accent">
                <Upload className="h-3.5 w-3.5" />
                <span>Choose image file...</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-label text-text-primary mb-1">
              Context Notes for AI Orchestrator
            </label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Explain what layout rules, spacing, or palette tokens the AI should extract from this reference..."
              className="w-full rounded-control border border-border bg-app px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-control border border-border bg-panel px-3 py-1.5 text-xs text-text-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-control bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              Save Reference
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-control border border-border bg-panel px-2.5 py-1.5 text-xs text-text-primary"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                Project: {p.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-control border border-border bg-panel px-2.5 py-1.5 text-xs text-text-primary"
          >
            <option value="all">All Reference Types</option>
            {REFERENCE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search references..."
            className="w-full rounded-control border border-border bg-panel pl-8 pr-3 py-1.5 text-xs text-text-primary"
          />
        </div>
      </div>

      {/* Reference Items Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRefs.map((ref) => {
          const projectObj = projects.find((p) => p.id === ref.projectId);

          return (
            <div
              key={ref.id}
              className={`flex flex-col justify-between rounded-panel border bg-panel overflow-hidden ${
                ref.attachedToTask ? 'border-accent' : 'border-border'
              }`}
            >
              {/* Preview Area */}
              <div className="relative h-36 border-b border-border bg-panel-muted flex items-center justify-center overflow-hidden">
                {ref.previewUrl ? (
                  <img
                    src={ref.previewUrl}
                    alt={ref.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-text-secondary p-4 text-center">
                    {getTypeIcon(ref.type)}
                    <span className="text-meta font-mono truncate max-w-[220px]">{ref.source}</span>
                  </div>
                )}

                <span className="absolute left-2.5 top-2.5 rounded border border-border bg-panel px-2 py-0.5 text-meta uppercase font-medium text-text-secondary">
                  {ref.type}
                </span>

                <button
                  type="button"
                  onClick={() => toggleReferenceTaskAttachment(ref.id)}
                  className={`absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded px-2 py-0.5 text-meta font-medium ${
                    ref.attachedToTask
                      ? 'bg-accent text-white'
                      : 'border border-border bg-panel text-text-secondary'
                  }`}
                >
                  <Paperclip className="h-3 w-3" />
                  <span>{ref.attachedToTask ? 'Attached to Task' : 'Saved Only'}</span>
                </button>
              </div>

              {/* Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  {renamingId === ref.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateReference(ref.id, { name: renameText });
                            setRenamingId(null);
                          }
                        }}
                        className="w-full rounded border border-accent bg-app px-2 py-1 text-xs text-text-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updateReference(ref.id, { name: renameText });
                          setRenamingId(null);
                        }}
                        className="rounded bg-accent px-2 py-1 text-meta text-white"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-semibold text-body text-text-primary">{ref.name}</h3>
                  )}

                  {projectObj && (
                    <div className="mt-0.5 text-meta text-text-muted">
                      Project: {projectObj.name}
                    </div>
                  )}

                  {ref.notes && (
                    <p className="mt-1.5 text-secondary text-text-secondary line-clamp-2">
                      {ref.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-2.5">
                  <span className="text-meta text-success font-medium">Status: {ref.status}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewRef(ref)}
                      title="Preview Reference"
                      className="p-1 text-text-secondary hover:text-text-primary rounded hover:bg-panel-muted"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(ref.id);
                        setRenameText(ref.name);
                      }}
                      title="Rename Reference"
                      className="p-1 text-text-secondary hover:text-text-primary rounded hover:bg-panel-muted"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReference(ref.id)}
                      title="Delete Reference"
                      className="p-1 text-text-secondary hover:text-danger rounded hover:bg-panel-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reference Preview Modal */}
      {previewRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-dialog border border-border bg-panel p-5 shadow-dialog space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-panel-title text-text-primary">{previewRef.name}</h3>
                <span className="text-meta text-text-muted uppercase">{previewRef.type}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRef(null)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {previewRef.previewUrl && (
              <div className="max-h-80 overflow-hidden rounded border border-border bg-panel-muted flex justify-center">
                <img
                  src={previewRef.previewUrl}
                  alt={previewRef.name}
                  className="max-h-80 object-contain"
                />
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-text-muted block">Source:</span>
                <span className="font-mono text-text-primary break-all">{previewRef.source}</span>
              </div>
              <div>
                <span className="text-text-muted block">AI Extraction Notes:</span>
                <p className="text-text-secondary">{previewRef.notes || 'No extra notes.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
