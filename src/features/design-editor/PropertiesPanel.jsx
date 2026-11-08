import React from 'react';
import {
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  FolderMinus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowDownUp,
  ArrowLeftRight,
  Move,
  Palette,
} from 'lucide-react';
import { NODE_TYPES, VIEWPORT_PRESETS } from '../../core/design-schema/schema.js';
import { getNodePath } from '../../core/design-schema/operations.js';
import { resolvePadding } from '../../core/exporters/figmaExporter.js';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { useDesignSystemStore } from '../../stores/useDesignSystemStore.js';

export default function PropertiesPanel() {
  const {
    activeDocument,
    selectedNodeId,
    setSelectedNodeId,
    getSelectedNode,
    updateSelectedNode,
    duplicateSelectedNode,
    deleteSelectedNode,
    reorderSelectedNode,
    groupSelectedNode,
    ungroupSelectedNode,
    setViewportDimensions,
    commitDocumentUpdate,
  } = useProjectStore();

  const { designSystem } = useDesignSystemStore();
  const selectedNode = getSelectedNode();

  if (!activeDocument?.document) return null;
  const doc = activeDocument.document;

  // Document-level inspector when no node is selected
  if (!selectedNode) {
    return (
      <div className="p-4 space-y-5 text-xs">
        <div className="border-b border-border pb-3">
          <span className="text-label uppercase tracking-wider text-text-secondary block">
            Document Artboard
          </span>
          <h3 className="mt-1 font-semibold text-sm text-text-primary">{doc.name}</h3>
          <span className="text-meta font-mono text-text-muted">
            Schema v{activeDocument.schemaVersion} • ID: {doc.id}
          </span>
        </div>

        <div className="space-y-3 border-b border-border pb-4">
          <label className="block text-label text-text-primary">Viewport Preset</label>
          <select
            value={`${doc.viewport?.width}x${doc.viewport?.height}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number);
              if (w && h) setViewportDimensions(w, h);
            }}
            className="w-full rounded-control border border-border bg-app px-2.5 py-1.5 text-xs text-text-primary"
          >
            {VIEWPORT_PRESETS.map((p) => (
              <option key={p.id} value={`${p.width}x${p.height}`}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-meta text-text-muted block mb-1">Width (px)</span>
              <input
                type="number"
                value={doc.viewport?.width || 1440}
                onChange={(e) => setViewportDimensions(Number(e.target.value), doc.viewport?.height)}
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
              />
            </div>
            <div>
              <span className="text-meta text-text-muted block mb-1">Height (px)</span>
              <input
                type="number"
                value={doc.viewport?.height || 1024}
                onChange={(e) => setViewportDimensions(doc.viewport?.width, Number(e.target.value))}
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-label text-text-primary">Artboard Background</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={doc.background || '#F8FAFC'}
              onChange={(e) => {
                const next = JSON.parse(JSON.stringify(activeDocument));
                next.document.background = e.target.value.toUpperCase();
                commitDocumentUpdate(next, true);
              }}
              className="h-7 w-9 cursor-pointer rounded border border-border bg-app p-0.5"
            />
            <input
              type="text"
              value={doc.background || '#F8FAFC'}
              onChange={(e) => {
                const next = JSON.parse(JSON.stringify(activeDocument));
                next.document.background = e.target.value;
                commitDocumentUpdate(next, true);
              }}
              className="flex-1 rounded border border-border bg-app px-2.5 py-1 text-xs font-mono text-text-primary"
            />
          </div>
        </div>

        <div className="rounded-control border border-border bg-panel-muted p-3 text-meta text-text-secondary leading-relaxed">
          Select any element on the canvas or in the Layer Tree to inspect and edit its dimensions, Flexbox layout, typography, colors, or design tokens.
        </div>
      </div>
    );
  }

  const nodePath = getNodePath(activeDocument, selectedNodeId);
  const layout = selectedNode.layout || {};
  const style = selectedNode.style || {};
  const typo = selectedNode.typography || {};
  const asset = selectedNode.asset || {};
  const pad = resolvePadding(layout.padding);
  const isContainer =
    selectedNode.type === NODE_TYPES.FRAME ||
    selectedNode.type === NODE_TYPES.GROUP ||
    selectedNode.type === NODE_TYPES.COMPONENT_INSTANCE;

  const handleLinkToken = (propPath, tokenId) => {
    const nextRefs = { ...(selectedNode.tokenRefs || {}) };
    if (!tokenId) {
      delete nextRefs[propPath];
    } else {
      nextRefs[propPath] = tokenId;
      // Also write immediate value for export fallback
      const allTokens = [
        ...designSystem.colors,
        ...designSystem.spacing,
        ...designSystem.radii,
        ...designSystem.typography,
      ];
      const found = allTokens.find((t) => t.id === tokenId);
      if (found) {
        if (propPath === 'style.background') updateSelectedNode({ style: { background: found.value } });
        if (propPath === 'style.color') updateSelectedNode({ style: { color: found.value } });
        if (propPath === 'style.borderRadius') updateSelectedNode({ style: { borderRadius: Number(found.value) } });
      }
    }
    updateSelectedNode({ tokenRefs: nextRefs });
  };

  return (
    <div className="divide-y divide-border text-xs">
      {/* 0. Selected Node Header & Quick Actions */}
      <div className="p-3.5 space-y-2.5">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-1 text-meta text-text-muted">
          {nodePath.slice(-3).map((item, idx, arr) => (
            <React.Fragment key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedNodeId(item.id)}
                className={`hover:text-accent truncate max-w-[90px] ${
                  item.id === selectedNode.id ? 'text-text-primary font-medium' : ''
                }`}
              >
                {item.name}
              </button>
              {idx < arr.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={selectedNode.name}
            onChange={(e) => updateSelectedNode({ name: e.target.value })}
            aria-label="Selected Layer Name"
            className="flex-1 rounded border border-border bg-app px-2 py-1 text-xs font-semibold text-text-primary focus:border-accent focus:outline-none"
          />
          <span className="rounded border border-border bg-panel-muted px-1.5 py-0.5 text-meta font-mono text-text-secondary">
            {selectedNode.type}
          </span>
        </div>

        {/* Layer Action Bar */}
        <div className="flex items-center justify-between gap-1 pt-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => reorderSelectedNode('UP')}
              title="Move Layer Up"
              className="rounded border border-border bg-panel-muted p-1.5 text-text-secondary hover:text-text-primary"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => reorderSelectedNode('DOWN')}
              title="Move Layer Down"
              className="rounded border border-border bg-panel-muted p-1.5 text-text-secondary hover:text-text-primary"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={groupSelectedNode}
              title="Wrap in Group"
              className="rounded border border-border bg-panel-muted p-1.5 text-text-secondary hover:text-text-primary"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            {isContainer && (
              <button
                type="button"
                onClick={ungroupSelectedNode}
                title="Ungroup Children"
                className="rounded border border-border bg-panel-muted p-1.5 text-text-secondary hover:text-text-primary"
              >
                <FolderMinus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={duplicateSelectedNode}
              title="Duplicate Node (Ctrl+D)"
              className="inline-flex items-center gap-1 rounded border border-border bg-panel-muted px-2 py-1 text-meta text-text-primary hover:border-accent"
            >
              <Copy className="h-3 w-3" />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onClick={deleteSelectedNode}
              title="Delete Node (Del)"
              className="inline-flex items-center gap-1 rounded border border-border bg-panel-muted px-2 py-1 text-meta text-danger hover:border-danger"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. Position & Dimensions */}
      <div className="p-3.5 space-y-3">
        <span className="text-label uppercase tracking-wider text-text-secondary block">
          Dimensions & Sizing
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-meta text-text-muted block mb-1">Width</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={typeof selectedNode.width === 'number' ? selectedNode.width : 240}
                disabled={selectedNode.width === 'FILL' || selectedNode.width === 'HUG'}
                onChange={(e) =>
                  updateSelectedNode({
                    width: Math.max(4, Number(e.target.value)),
                    layout: { widthMode: 'FIXED' },
                  })
                }
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary disabled:opacity-50"
              />
              <select
                value={
                  selectedNode.width === 'FILL'
                    ? 'FILL'
                    : selectedNode.width === 'HUG'
                    ? 'HUG'
                    : layout.widthMode || 'FIXED'
                }
                onChange={(e) => {
                  const mode = e.target.value;
                  updateSelectedNode({
                    width: mode === 'FIXED' ? (typeof selectedNode.width === 'number' ? selectedNode.width : 280) : mode,
                    layout: { widthMode: mode },
                  });
                }}
                className="rounded border border-border bg-app px-1.5 py-1 text-meta text-text-secondary"
              >
                <option value="FIXED">Fixed</option>
                <option value="FILL">Fill</option>
                <option value="HUG">Hug</option>
              </select>
            </div>
          </div>

          <div>
            <span className="text-meta text-text-muted block mb-1">Height</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={typeof selectedNode.height === 'number' ? selectedNode.height : 120}
                disabled={selectedNode.height === 'FILL' || selectedNode.height === 'HUG'}
                onChange={(e) =>
                  updateSelectedNode({
                    height: Math.max(4, Number(e.target.value)),
                    layout: { heightMode: 'FIXED' },
                  })
                }
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary disabled:opacity-50"
              />
              <select
                value={
                  selectedNode.height === 'FILL'
                    ? 'FILL'
                    : selectedNode.height === 'HUG'
                    ? 'HUG'
                    : layout.heightMode || 'HUG'
                }
                onChange={(e) => {
                  const mode = e.target.value;
                  updateSelectedNode({
                    height: mode === 'FIXED' ? (typeof selectedNode.height === 'number' ? selectedNode.height : 120) : mode,
                    layout: { heightMode: mode },
                  });
                }}
                className="rounded border border-border bg-app px-1.5 py-1 text-meta text-text-secondary"
              >
                <option value="FIXED">Fixed</option>
                <option value="FILL">Fill</option>
                <option value="HUG">Hug</option>
              </select>
            </div>
          </div>
        </div>

        {/* Free Position Offset X / Y */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-meta text-text-muted block mb-1">X Offset (px)</span>
            <input
              type="number"
              value={Number(selectedNode.x || 0)}
              onChange={(e) => updateSelectedNode({ x: Number(e.target.value) })}
              className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
            />
          </div>
          <div>
            <span className="text-meta text-text-muted block mb-1">Y Offset (px)</span>
            <input
              type="number"
              value={Number(selectedNode.y || 0)}
              onChange={(e) => updateSelectedNode({ y: Number(e.target.value) })}
              className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
            />
          </div>
        </div>
      </div>

      {/* 2. Layout & Spacing (For Containers) */}
      {isContainer && (
        <div className="p-3.5 space-y-3">
          <span className="text-label uppercase tracking-wider text-text-secondary block">
            Layout & Spacing
          </span>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'VERTICAL', label: 'Column', icon: ArrowDownUp },
              { id: 'HORIZONTAL', label: 'Row', icon: ArrowLeftRight },
              { id: 'NONE', label: 'Free', icon: Move },
            ].map((m) => {
              const Icon = m.icon;
              const active = (layout.mode || 'VERTICAL') === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateSelectedNode({ layout: { mode: m.id } })}
                  className={`flex items-center justify-center gap-1 rounded border py-1.5 text-meta font-medium ${
                    active
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-border bg-app text-text-secondary'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-meta text-text-muted block mb-1">Gap (px)</span>
              <input
                type="number"
                min={0}
                value={Number(layout.gap || 0)}
                onChange={(e) => updateSelectedNode({ layout: { gap: Math.max(0, Number(e.target.value)) } })}
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
              />
            </div>

            <div>
              <span className="text-meta text-text-muted block mb-1">Padding (Uniform px)</span>
              <input
                type="number"
                min={0}
                value={pad.top}
                onChange={(e) =>
                  updateSelectedNode({ layout: { padding: Math.max(0, Number(e.target.value)) } })
                }
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
              />
            </div>
          </div>

          {/* 4-Side Padding Controls */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { side: 'top', label: 'Top' },
              { side: 'right', label: 'Right' },
              { side: 'bottom', label: 'Bottom' },
              { side: 'left', label: 'Left' },
            ].map((item) => (
              <div key={item.side}>
                <span className="text-meta text-text-muted block text-center">{item.label}</span>
                <input
                  type="number"
                  min={0}
                  value={pad[item.side]}
                  onChange={(e) =>
                    updateSelectedNode({
                      layout: {
                        padding: {
                          ...pad,
                          [item.side]: Math.max(0, Number(e.target.value)),
                        },
                      },
                    })
                  }
                  className="w-full rounded border border-border bg-app px-1.5 py-1 text-center text-meta font-mono text-text-primary"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-meta text-text-muted block mb-1">Main Alignment</span>
              <select
                value={layout.alignment || 'START'}
                onChange={(e) => updateSelectedNode({ layout: { alignment: e.target.value } })}
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs text-text-primary"
              >
                <option value="START">Start</option>
                <option value="CENTER">Center</option>
                <option value="END">End</option>
                <option value="SPACE_BETWEEN">Space Between</option>
              </select>
            </div>
            <div>
              <span className="text-meta text-text-muted block mb-1">Cross Alignment</span>
              <select
                value={layout.crossAlignment || 'STRETCH'}
                onChange={(e) => updateSelectedNode({ layout: { crossAlignment: e.target.value } })}
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs text-text-primary"
              >
                <option value="STRETCH">Stretch</option>
                <option value="START">Start</option>
                <option value="CENTER">Center</option>
                <option value="END">End</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={Boolean(layout.clipContent)}
              onChange={(e) => updateSelectedNode({ layout: { clipContent: e.target.checked } })}
              className="rounded border-border text-accent"
            />
            <span>Clip overflowing child layers</span>
          </label>
        </div>
      )}

      {/* 3. Typography (For TEXT Nodes) */}
      {selectedNode.type === NODE_TYPES.TEXT && (
        <div className="p-3.5 space-y-3">
          <span className="text-label uppercase tracking-wider text-text-secondary block">
            Typography & Text Content
          </span>

          <div>
            <span className="text-meta text-text-muted block mb-1">Text Content</span>
            <textarea
              rows={2}
              value={selectedNode.text ?? selectedNode.content ?? ''}
              onChange={(e) => updateSelectedNode({ text: e.target.value })}
              aria-label="Text Content"
              className="w-full rounded border border-border bg-app p-2 text-xs text-text-primary focus:border-accent focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-meta text-text-muted block mb-1">Font Family</span>
              <select
                value={typo.fontFamily || 'Inter'}
                onChange={(e) => updateSelectedNode({ typography: { fontFamily: e.target.value } })}
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs text-text-primary"
              >
                <option value="Inter">Inter</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="System UI">System Sans</option>
                <option value="Georgia">Georgia Serif</option>
              </select>
            </div>

            <div>
              <span className="text-meta text-text-muted block mb-1">Font Weight</span>
              <select
                value={Number(typo.fontWeight || 400)}
                onChange={(e) =>
                  updateSelectedNode({ typography: { fontWeight: Number(e.target.value) } })
                }
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs text-text-primary"
              >
                <option value={400}>400 Regular</option>
                <option value={500}>500 Medium</option>
                <option value={600}>600 SemiBold</option>
                <option value={700}>700 Bold</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-meta text-text-muted block mb-1">Size (px)</span>
              <input
                type="number"
                min={8}
                max={180}
                value={Number(typo.fontSize || 14)}
                onChange={(e) =>
                  updateSelectedNode({ typography: { fontSize: Number(e.target.value) } })
                }
                aria-label="Font Size"
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
              />
            </div>

            <div>
              <span className="text-meta text-text-muted block mb-1">Line Height</span>
              <input
                type="number"
                step="0.1"
                value={Number(typo.lineHeight || 1.4)}
                onChange={(e) =>
                  updateSelectedNode({ typography: { lineHeight: Number(e.target.value) } })
                }
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
              />
            </div>

            <div>
              <span className="text-meta text-text-muted block mb-1">Align</span>
              <div className="grid grid-cols-3 rounded border border-border bg-app p-0.5">
                {[
                  { id: 'LEFT', icon: AlignLeft },
                  { id: 'CENTER', icon: AlignCenter },
                  { id: 'RIGHT', icon: AlignRight },
                ].map((al) => {
                  const Icon = al.icon;
                  return (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() => updateSelectedNode({ typography: { textAlign: al.id } })}
                      className={`flex items-center justify-center rounded py-1 ${
                        (typo.textAlign || 'LEFT') === al.id
                          ? 'bg-accent text-white'
                          : 'text-text-secondary'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <span className="text-meta text-text-muted block mb-1">Text Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.color || '#0F172A'}
                onChange={(e) =>
                  updateSelectedNode({ style: { color: e.target.value.toUpperCase() } })
                }
                className="h-7 w-9 cursor-pointer rounded border border-border bg-app p-0.5"
              />
              <input
                type="text"
                value={style.color || '#0F172A'}
                onChange={(e) => updateSelectedNode({ style: { color: e.target.value } })}
                aria-label="Text Color Hex"
                className="flex-1 rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Appearance (Fill, Border, Radius, Opacity, Tokens) */}
      <div className="p-3.5 space-y-3">
        <span className="text-label uppercase tracking-wider text-text-secondary block">
          Appearance & Tokens
        </span>

        {selectedNode.type !== NODE_TYPES.TEXT && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-meta text-text-muted">Background Fill</span>
              <select
                value={selectedNode.tokenRefs?.['style.background'] || ''}
                onChange={(e) => handleLinkToken('style.background', e.target.value)}
                className="rounded border border-border bg-app px-1.5 py-0.5 text-meta text-text-secondary"
              >
                <option value="">Custom Value</option>
                {designSystem.colors.map((t) => (
                  <option key={t.id} value={t.id}>
                    Token: {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.background || style.fill || '#FFFFFF'}
                onChange={(e) =>
                  updateSelectedNode({ style: { background: e.target.value.toUpperCase() } })
                }
                className="h-7 w-9 cursor-pointer rounded border border-border bg-app p-0.5"
              />
              <input
                type="text"
                value={style.background || style.fill || ''}
                placeholder="transparent or #HEX"
                onChange={(e) => updateSelectedNode({ style: { background: e.target.value } })}
                aria-label="Background Fill Hex"
                className="flex-1 rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
              />
            </div>
          </div>
        )}

        {selectedNode.type !== NODE_TYPES.TEXT && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-meta text-text-muted block mb-1">Border Color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={style.borderColor || '#E2E8F0'}
                  onChange={(e) =>
                    updateSelectedNode({ style: { borderColor: e.target.value.toUpperCase() } })
                  }
                  className="h-7 w-8 cursor-pointer rounded border border-border bg-app p-0.5"
                />
                <input
                  type="text"
                  value={style.borderColor || ''}
                  placeholder="#E2E8F0"
                  onChange={(e) => updateSelectedNode({ style: { borderColor: e.target.value } })}
                  className="w-full rounded border border-border bg-app px-2 py-1 text-meta font-mono text-text-primary"
                />
              </div>
            </div>

            <div>
              <span className="text-meta text-text-muted block mb-1">Border Width (px)</span>
              <input
                type="number"
                min={0}
                max={24}
                value={Number(style.borderWidth || 0)}
                onChange={(e) =>
                  updateSelectedNode({ style: { borderWidth: Math.max(0, Number(e.target.value)) } })
                }
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-meta text-text-muted block mb-1">Corner Radius (px)</span>
            <input
              type="number"
              min={0}
              value={Number(style.borderRadius || 0)}
              onChange={(e) =>
                updateSelectedNode({ style: { borderRadius: Math.max(0, Number(e.target.value)) } })
              }
              aria-label="Corner Radius"
              className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
            />
          </div>

          <div>
            <span className="text-meta text-text-muted block mb-1">Opacity (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round((typeof style.opacity === 'number' ? style.opacity : 1) * 100)}
              onChange={(e) =>
                updateSelectedNode({
                  style: {
                    opacity: Math.min(1, Math.max(0, Number(e.target.value) / 100)),
                  },
                })
              }
              className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
            />
          </div>
        </div>
      </div>

      {/* 5. Image Settings (For IMAGE Nodes) */}
      {selectedNode.type === NODE_TYPES.IMAGE && (
        <div className="p-3.5 space-y-3">
          <span className="text-label uppercase tracking-wider text-text-secondary block">
            Image Asset Settings
          </span>

          <div>
            <span className="text-meta text-text-muted block mb-1">Image Source URL</span>
            <input
              type="text"
              value={asset.src || ''}
              onChange={(e) => updateSelectedNode({ asset: { src: e.target.value } })}
              className="w-full rounded border border-border bg-app px-2 py-1 text-xs font-mono text-text-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-meta text-text-muted block mb-1">Fit Mode</span>
              <select
                value={asset.fit || 'COVER'}
                onChange={(e) => updateSelectedNode({ asset: { fit: e.target.value } })}
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs text-text-primary"
              >
                <option value="COVER">Cover</option>
                <option value="CONTAIN">Contain</option>
                <option value="FILL">Stretch Fill</option>
              </select>
            </div>

            <div>
              <span className="text-meta text-text-muted block mb-1">Alt Description</span>
              <input
                type="text"
                value={asset.alt || ''}
                onChange={(e) => updateSelectedNode({ asset: { alt: e.target.value } })}
                className="w-full rounded border border-border bg-app px-2 py-1 text-xs text-text-primary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
