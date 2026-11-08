import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Palette,
  Type,
  Maximize2,
  Square,
  Layers,
  Plus,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { useDesignSystemStore } from '../../stores/useDesignSystemStore.js';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { generateNodeId } from '../../core/design-schema/schema.js';

export default function DesignSystemPage() {
  const navigate = useNavigate();
  const { designSystem, updateToken, addToken, deleteToken } = useDesignSystemStore();
  const { insertCustomNode } = useProjectStore();

  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#3B82F6');

  const handleAddColorToken = async (e) => {
    e.preventDefault();
    if (!newColorName.trim()) return;
    await addToken('colors', {
      name: newColorName.trim(),
      value: newColorHex,
      category: 'Custom',
    });
    setNewColorName('');
  };

  const handleInsertComponentToWorkspace = async (compDef) => {
    const hydrateIds = (node) => ({
      ...node,
      id: generateNodeId(node.type || 'node'),
      children: Array.isArray(node.children) ? node.children.map(hydrateIds) : undefined,
    });
    await insertCustomNode(hydrateIds(compDef.templateNode));
    navigate('/workspace');
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-page-title text-text-primary">{designSystem.name}</h1>
          <p className="mt-1 text-secondary text-text-secondary">
            Manage color, typography, spacing, radius, and shadow tokens plus reusable component instances. Updating a token updates all linked schema nodes.
          </p>
        </div>
      </div>

      {/* Color Tokens */}
      <section className="rounded-panel border border-border bg-panel p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-accent" />
            <h2 className="text-panel-title text-text-primary">
              Color Tokens ({designSystem.colors.length})
            </h2>
          </div>

          <form onSubmit={handleAddColorToken} className="flex items-center gap-2">
            <input
              type="text"
              value={newColorName}
              onChange={(e) => setNewColorName(e.target.value)}
              placeholder="New color token name..."
              className="rounded-control border border-border bg-app px-2.5 py-1 text-xs text-text-primary"
            />
            <input
              type="color"
              value={newColorHex}
              onChange={(e) => setNewColorHex(e.target.value)}
              className="h-7 w-9 cursor-pointer rounded border border-border bg-app p-0.5"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-control bg-accent px-3 py-1 text-xs font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Token</span>
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {designSystem.colors.map((token) => (
            <div
              key={token.id}
              className="rounded-control border border-border bg-app p-3 flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="color"
                  value={token.value}
                  onChange={(e) => updateToken('colors', token.id, { value: e.target.value.toUpperCase() })}
                  className="h-7 w-10 cursor-pointer rounded border border-border bg-panel p-0.5"
                  title="Edit token color"
                />
                <span className="text-meta font-mono text-text-secondary">{token.value}</span>
              </div>

              <div>
                <div className="text-xs font-semibold text-text-primary truncate">{token.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-meta font-mono text-text-muted truncate">{token.id}</span>
                  {token.category === 'Custom' && (
                    <button
                      type="button"
                      onClick={() => deleteToken('colors', token.id)}
                      className="text-text-muted hover:text-danger"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography, Spacing & Radius Tokens */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Typography */}
        <section className="rounded-panel border border-border bg-panel p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2.5">
            <Type className="h-4 w-4 text-accent" />
            <h2 className="text-panel-title text-text-primary">Typography Scale</h2>
          </div>
          <div className="divide-y divide-border">
            {designSystem.typography.map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-medium text-text-primary">{t.name}</div>
                  <div className="text-meta text-text-muted">
                    {t.family} • Weight {t.weight}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={t.value}
                    onChange={(e) => updateToken('typography', t.id, { value: Number(e.target.value) })}
                    className="w-16 rounded border border-border bg-app px-2 py-1 text-xs text-right font-mono text-text-primary"
                  />
                  <span className="text-meta text-text-muted">px</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Spacing */}
        <section className="rounded-panel border border-border bg-panel p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2.5">
            <Maximize2 className="h-4 w-4 text-accent" />
            <h2 className="text-panel-title text-text-primary">Spacing Scale (4px Base)</h2>
          </div>
          <div className="divide-y divide-border">
            {designSystem.spacing.map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 bg-accent/70 rounded-sm"
                    style={{ width: `${Math.min(48, s.value * 1.5)}px` }}
                  />
                  <span className="text-xs font-medium text-text-primary">{s.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={s.value}
                    onChange={(e) => updateToken('spacing', s.id, { value: Number(e.target.value) })}
                    className="w-16 rounded border border-border bg-app px-2 py-1 text-xs text-right font-mono text-text-primary"
                  />
                  <span className="text-meta text-text-muted">px</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Radii & Shadows */}
        <section className="rounded-panel border border-border bg-panel p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2.5">
            <Square className="h-4 w-4 text-accent" />
            <h2 className="text-panel-title text-text-primary">Corner Radius & Elevation</h2>
          </div>
          <div className="divide-y divide-border">
            {designSystem.radii.map((r) => (
              <div key={r.id} className="py-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-text-primary">{r.name}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={r.value}
                    onChange={(e) => updateToken('radii', r.id, { value: Number(e.target.value) })}
                    className="w-16 rounded border border-border bg-app px-2 py-1 text-xs text-right font-mono text-text-primary"
                  />
                  <span className="text-meta text-text-muted">px</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Reusable Components Library */}
      <section className="rounded-panel border border-border bg-panel p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            <h2 className="text-panel-title text-text-primary">
              Reusable Component Definitions ({designSystem.components.length})
            </h2>
          </div>
          <span className="text-meta text-text-muted">
            Click "Insert into Workspace" to instantiate any component into your active design
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {designSystem.components.map((comp) => (
            <div
              key={comp.id}
              className="flex flex-col justify-between rounded-control border border-border bg-app p-4 space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">{comp.name}</span>
                  <span className="rounded border border-border bg-panel px-2 py-0.5 text-meta text-text-secondary">
                    {comp.category}
                  </span>
                </div>
                <p className="mt-1 text-secondary text-text-secondary">{comp.description}</p>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-meta font-mono text-text-muted">{comp.id}</span>
                <button
                  type="button"
                  onClick={() => handleInsertComponentToWorkspace(comp)}
                  className="inline-flex items-center gap-1 rounded-control bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover"
                >
                  <span>Insert into Workspace</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
