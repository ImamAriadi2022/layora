import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layout,
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Activity,
  Folder,
  Component,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Search,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { NODE_TYPES } from '../../core/design-schema/schema.js';
import { useProjectStore } from '../../stores/useProjectStore.js';

function getNodeIcon(type) {
  switch (type) {
    case NODE_TYPES.TEXT:
      return <Type className="h-3.5 w-3.5 shrink-0 text-text-secondary" />;
    case NODE_TYPES.RECTANGLE:
      return <Square className="h-3.5 w-3.5 shrink-0 text-text-secondary" />;
    case NODE_TYPES.ELLIPSE:
      return <Circle className="h-3.5 w-3.5 shrink-0 text-text-secondary" />;
    case NODE_TYPES.IMAGE:
      return <ImageIcon className="h-3.5 w-3.5 shrink-0 text-text-secondary" />;
    case NODE_TYPES.VECTOR:
      return <Activity className="h-3.5 w-3.5 shrink-0 text-text-secondary" />;
    case NODE_TYPES.GROUP:
      return <Folder className="h-3.5 w-3.5 shrink-0 text-text-secondary" />;
    case NODE_TYPES.COMPONENT_INSTANCE:
      return <Component className="h-3.5 w-3.5 shrink-0 text-accent" />;
    default:
      return <Layout className="h-3.5 w-3.5 shrink-0 text-text-secondary" />;
  }
}

function LayerRowItem({
  node,
  depth = 0,
  selectedNodeId,
  hoveredNodeId,
  searchQuery,
  onSelect,
  onHover,
  onUpdateNode,
  onDuplicate,
  onDelete,
  onReorder,
}) {
  const [expanded, setExpanded] = useState(depth < 3);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(node.name);

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const isHovered = hoveredNodeId === node.id && !isSelected;

  const matchesSearch =
    !searchQuery ||
    node.name.toLowerCase().includes(searchQuery) ||
    (node.text || '').toLowerCase().includes(searchQuery);

  const childMatches =
    hasChildren &&
    JSON.stringify(node.children).toLowerCase().includes(searchQuery);

  if (searchQuery && !matchesSearch && !childMatches) {
    return null;
  }

  return (
    <div>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className={`group flex h-7 items-center justify-between pr-2 text-xs cursor-pointer select-none border-l-2 transition-colors ${
          isSelected
            ? 'border-accent bg-accent-subtle text-accent font-medium'
            : isHovered
            ? 'border-transparent bg-panel-muted text-text-primary'
            : 'border-transparent text-text-primary hover:bg-panel-muted'
        } ${node.visible === false ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="flex h-4 w-4 items-center justify-center rounded hover:bg-border/60 text-text-muted"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {getNodeIcon(node.type)}

          {renaming ? (
            <input
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => {
                setRenaming(false);
                if (nameInput.trim() && nameInput.trim() !== node.name) {
                  onUpdateNode(node.id, { name: nameInput.trim() });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  setNameInput(node.name);
                  setRenaming(false);
                }
              }}
              className="w-full rounded border border-accent bg-panel px-1 py-0.5 text-xs text-text-primary focus:outline-none"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setNameInput(node.name);
                setRenaming(true);
              }}
              className="truncate"
              title={`${node.name} (${node.type}) — Double-click to rename`}
            >
              {node.name}
            </span>
          )}
        </div>

        {/* Layer Controls */}
        <div
          className={`flex items-center gap-0.5 ${
            isSelected || node.visible === false || node.locked
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {isSelected && (
            <>
              <button
                type="button"
                title="Move Layer Up"
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder('UP');
                }}
                className="p-0.5 text-text-secondary hover:text-text-primary"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="Move Layer Down"
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder('DOWN');
                }}
                className="p-0.5 text-text-secondary hover:text-text-primary"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="Duplicate Layer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="p-0.5 text-text-secondary hover:text-text-primary"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="Delete Layer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-0.5 text-text-secondary hover:text-danger"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}

          <button
            type="button"
            title={node.locked ? 'Unlock Layer' : 'Lock Layer'}
            onClick={(e) => {
              e.stopPropagation();
              onUpdateNode(node.id, { locked: !node.locked });
            }}
            className="p-0.5 text-text-secondary hover:text-text-primary"
          >
            {node.locked ? <Lock className="h-3 w-3 text-warning" /> : <Unlock className="h-3 w-3" />}
          </button>

          <button
            type="button"
            title={node.visible === false ? 'Show Layer' : 'Hide Layer'}
            onClick={(e) => {
              e.stopPropagation();
              onUpdateNode(node.id, { visible: node.visible === false });
            }}
            className="p-0.5 text-text-secondary hover:text-text-primary"
          >
            {node.visible === false ? (
              <EyeOff className="h-3 w-3 text-text-muted" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {hasChildren && (expanded || Boolean(searchQuery)) && (
        <div className="border-l border-border/50 ml-3">
          {node.children.map((child) => (
            <LayerRowItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              searchQuery={searchQuery}
              onSelect={onSelect}
              onHover={onHover}
              onUpdateNode={onUpdateNode}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onReorder={onReorder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LayerTreePanel() {
  const {
    activeDocument,
    selectedNodeId,
    hoveredNodeId,
    setSelectedNodeId,
    setHoveredNodeId,
    updateNodeById,
    duplicateSelectedNode,
    deleteSelectedNode,
    reorderSelectedNode,
    switchPage,
    addPage,
  } = useProjectStore();

  const [layerSearch, setLayerSearch] = useState('');
  const [addingPage, setAddingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');

  const doc = activeDocument?.document;
  const pages = doc?.pages || [];
  const activePageId = doc?.activePageId || pages[0]?.id;
  const children = doc?.children || [];

  const handleAddPageSubmit = async (e) => {
    e.preventDefault();
    if (!newPageName.trim()) return;
    await addPage(newPageName.trim());
    setNewPageName('');
    setAddingPage(false);
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-panel select-none">
      {/* Pages Section */}
      <div className="border-b border-border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-label uppercase tracking-wider text-text-secondary">
            Pages ({Math.max(1, pages.length)})
          </span>
          <button
            type="button"
            onClick={() => setAddingPage(!addingPage)}
            title="Add New Page"
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-panel-muted text-text-secondary hover:text-text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {addingPage && (
          <form onSubmit={handleAddPageSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              placeholder="Page name..."
              className="w-full rounded border border-accent bg-app px-2 py-1 text-xs text-text-primary focus:outline-none"
            />
            <button
              type="submit"
              className="rounded bg-accent px-2 py-1 text-meta text-white"
            >
              Add
            </button>
          </form>
        )}

        <div className="space-y-0.5 max-h-28 overflow-y-auto">
          {pages.length > 0 ? (
            pages.map((page) => {
              const isCurrent = page.id === activePageId;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => switchPage(page.id)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
                    isCurrent
                      ? 'bg-accent-subtle text-accent font-medium'
                      : 'text-text-secondary hover:bg-panel-muted hover:text-text-primary'
                  }`}
                >
                  <span className="truncate">{page.name}</span>
                  <span className="text-meta text-text-muted">
                    {page.viewport?.width}×{page.viewport?.height}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="rounded bg-accent-subtle px-2 py-1 text-xs font-medium text-accent flex justify-between">
              <span className="truncate">{doc?.name || 'Main Page'}</span>
              <span className="text-meta">
                {doc?.viewport?.width}×{doc?.viewport?.height}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Layers Header & Search */}
      <div className="border-b border-border p-2.5 space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-label uppercase tracking-wider text-text-secondary">
            Layers
          </span>
          {selectedNodeId && (
            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              className="text-meta text-accent hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1.5 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={layerSearch}
            onChange={(e) => setLayerSearch(e.target.value)}
            placeholder="Filter layers..."
            aria-label="Search layers"
            className="w-full rounded border border-border bg-app pl-7 pr-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Recursive Layer Tree */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {children.length === 0 ? (
          <p className="p-4 text-center text-meta text-text-muted">
            No layers on this page. Use the top toolbar or AI Chat to add elements.
          </p>
        ) : (
          children.map((node) => (
            <LayerRowItem
              key={node.id}
              node={node}
              depth={0}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              searchQuery={layerSearch.toLowerCase().trim()}
              onSelect={setSelectedNodeId}
              onHover={setHoveredNodeId}
              onUpdateNode={updateNodeById}
              onDuplicate={duplicateSelectedNode}
              onDelete={deleteSelectedNode}
              onReorder={reorderSelectedNode}
            />
          ))
        )}
      </div>
    </aside>
  );
}
