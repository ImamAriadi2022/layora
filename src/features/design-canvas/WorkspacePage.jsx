import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  MousePointer,
  Hand,
  Copy,
  Check,
  Layout,
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Component,
  Sliders,
  Sparkles,
  History,
  FileJson,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X,
} from 'lucide-react';
import { NODE_TYPES, VIEWPORT_PRESETS } from '../../core/design-schema/schema.js';
import { findParentNode, serializeSchema } from '../../core/design-schema/operations.js';
import { normalizeAndValidateSchema } from '../../core/validator/validator.js';
import { copyDesignToFigmaClipboard } from '../../core/exporters/figmaExporter.js';
import DesignRenderer from '../../core/renderer/DesignRenderer.jsx';
import CanvasSelectionOverlay from './CanvasSelectionOverlay.jsx';
import LayerTreePanel from '../design-editor/LayerTreePanel.jsx';
import PropertiesPanel from '../design-editor/PropertiesPanel.jsx';
import AiDesignChatPanel from '../design-chat/AiDesignChatPanel.jsx';
import VersionHistoryPanel from '../version-history/VersionHistoryPanel.jsx';
import FigmaExportModal from '../figma-export/FigmaExportModal.jsx';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { useDesignSystemStore } from '../../stores/useDesignSystemStore.js';

export default function WorkspacePage() {
  const {
    projects,
    activeProjectId,
    activeDocument,
    selectedNodeId,
    hoveredNodeId,
    setSelectedNodeId,
    setHoveredNodeId,
    undoStack,
    redoStack,
    undo,
    redo,
    canvasState,
    setCanvasZoom,
    setCanvasPan,
    setCanvasTool,
    resetCanvasView,
    addNodeToCanvas,
    updateNodeById,
    duplicateSelectedNode,
    deleteSelectedNode,
    setViewportDimensions,
    commitDocumentUpdate,
    selectProject,
    pendingRevision,
    saveStatus,
    logActivity,
  } = useProjectStore();

  const { designSystem } = useDesignSystemStore();

  const artboardRef = useRef(null);
  const [rightTab, setRightTab] = useState('properties'); // 'properties' | 'chat' | 'versions'
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [schemaEditorText, setSchemaEditorText] = useState('');
  const [schemaEditorError, setSchemaEditorError] = useState(null);
  const [quickCopyToast, setQuickCopyToast] = useState(null);
  const [panning, setPanning] = useState(null);

  const displayedDocument = pendingRevision?.updatedDocument || activeDocument;
  const doc = displayedDocument?.document;
  const viewport = doc?.viewport || { width: 1440, height: 1024 };

  // Global Workspace Keyboard Shortcuts (design.md Section 6.3 & 11)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isEditingInput = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (isEditingInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedNodeId) {
          e.preventDefault();
          duplicateSelectedNode();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          deleteSelectedNode();
        }
      } else if (e.key === 'Escape') {
        if (selectedNodeId && displayedDocument) {
          const parentInfo = findParentNode(displayedDocument, selectedNodeId);
          setSelectedNodeId(parentInfo?.parent?.id || null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    displayedDocument,
    undo,
    redo,
    duplicateSelectedNode,
    deleteSelectedNode,
    setSelectedNodeId,
  ]);

  const handleQuickCopyToFigma = async () => {
    if (!displayedDocument) return;
    const res = await copyDesignToFigmaClipboard(displayedDocument, artboardRef.current);
    if (res.success) {
      setQuickCopyToast({
        ok: true,
        message: `Copied ${res.compatibility.supportedCount} editable layers to clipboard! Paste in Figma with Ctrl+V.`,
      });
      const activeProj = projects.find((p) => p.id === activeProjectId);
      if (activeProj) {
        logActivity(
          activeProj.id,
          activeProj.name,
          `Copied ${res.compatibility.supportedCount} layers to Figma clipboard`,
          'Completed'
        );
      }
    } else {
      setQuickCopyToast({
        ok: false,
        message: res.error || 'Clipboard write failed. Open Export Inspector for fallback.',
      });
    }
    setTimeout(() => setQuickCopyToast(null), 4500);
  };

  const handleOpenSchemaInspector = () => {
    setSchemaEditorText(serializeSchema(displayedDocument));
    setSchemaEditorError(null);
    setShowSchemaModal(true);
  };

  const handleApplyRawSchema = async () => {
    setSchemaEditorError(null);
    const validation = normalizeAndValidateSchema(schemaEditorText);
    if (!validation.valid) {
      setSchemaEditorError(validation.diagnostics.errors.join('; '));
      return;
    }
    await commitDocumentUpdate(validation.document, true);
    setShowSchemaModal(false);
  };

  const handleCanvasMouseDown = (e) => {
    if (canvasState.tool === 'hand' || e.button === 1) {
      e.preventDefault();
      setPanning({
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: canvasState.panX,
        initialPanY: canvasState.panY,
      });
    } else if (e.target === e.currentTarget) {
      setSelectedNodeId(null);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!panning) return;
    const dx = e.clientX - panning.startX;
    const dy = e.clientY - panning.startY;
    setCanvasPan(panning.initialPanX + dx, panning.initialPanY + dy);
  };

  const handleCanvasMouseUp = () => {
    if (panning) setPanning(null);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-app">
      {/* TOP WORKSPACE TOOLBAR (design.md Section 3.3 & Section 5E) */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-panel px-3 z-30">
        {/* Left: Panel Toggle, Project Switcher & Save Status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            title={leftPanelOpen ? 'Collapse Layers Panel' : 'Expand Layers Panel'}
            className="p-1.5 rounded text-text-secondary hover:bg-panel-muted hover:text-text-primary"
          >
            {leftPanelOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>

          <select
            value={activeProjectId || ''}
            onChange={(e) => selectProject(e.target.value)}
            aria-label="Active Project"
            className="rounded-control border border-border bg-panel-muted px-2.5 py-1 text-xs font-semibold text-text-primary focus:border-accent focus:outline-none max-w-[200px]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <span className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-app px-2 py-0.5 text-meta text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {saveStatus}
          </span>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Undo & Redo */}
          <button
            type="button"
            onClick={undo}
            disabled={undoStack.length === 0}
            title={`Undo (Ctrl+Z) — ${undoStack.length} step(s)`}
            aria-label="Undo"
            className="p-1.5 rounded text-text-secondary hover:bg-panel-muted hover:text-text-primary disabled:opacity-35"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={redoStack.length === 0}
            title={`Redo (Ctrl+Y) — ${redoStack.length} step(s)`}
            aria-label="Redo"
            className="p-1.5 rounded text-text-secondary hover:bg-panel-muted hover:text-text-primary disabled:opacity-35"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        {/* Center: Add Node Tools & Canvas Viewport/Zoom */}
        <div className="hidden md:flex items-center gap-1.5">
          {/* Tool Mode Switch */}
          <div className="flex items-center rounded-control border border-border bg-app p-0.5">
            <button
              type="button"
              onClick={() => setCanvasTool('select')}
              title="Select Tool (V)"
              className={`p-1 rounded ${
                canvasState.tool === 'select'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <MousePointer className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCanvasTool('hand')}
              title="Hand / Pan Tool (H)"
              className={`p-1 rounded ${
                canvasState.tool === 'hand'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Hand className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-0.5" />

          {/* Quick Insert Schema Elements */}
          <div className="flex items-center gap-1 rounded-control border border-border bg-app px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => addNodeToCanvas(NODE_TYPES.FRAME, { name: 'New Frame' })}
              title="Add Frame Container"
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-meta text-text-secondary hover:bg-panel-muted hover:text-text-primary"
            >
              <Layout className="h-3.5 w-3.5" />
              <span>Frame</span>
            </button>
            <button
              type="button"
              onClick={() => addNodeToCanvas(NODE_TYPES.TEXT, { name: 'Heading Text', text: 'New Heading' })}
              title="Add Text Layer"
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-meta text-text-secondary hover:bg-panel-muted hover:text-text-primary"
            >
              <Type className="h-3.5 w-3.5" />
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => addNodeToCanvas(NODE_TYPES.RECTANGLE, { name: 'Rectangle Block' })}
              title="Add Rectangle"
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-meta text-text-secondary hover:bg-panel-muted hover:text-text-primary"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Rect</span>
            </button>
            <button
              type="button"
              onClick={() => addNodeToCanvas(NODE_TYPES.ELLIPSE, { name: 'Ellipse Shape' })}
              title="Add Ellipse"
              className="p-1 rounded text-text-secondary hover:bg-panel-muted hover:text-text-primary"
            >
              <Circle className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => addNodeToCanvas(NODE_TYPES.IMAGE, { name: 'Image Layer' })}
              title="Add Image Asset"
              className="p-1 rounded text-text-secondary hover:bg-panel-muted hover:text-text-primary"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => addNodeToCanvas(NODE_TYPES.COMPONENT_INSTANCE, { name: 'Action Button' })}
              title="Add Component Instance"
              className="p-1 rounded text-text-secondary hover:bg-panel-muted hover:text-text-primary"
            >
              <Component className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-0.5" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 rounded-control border border-border bg-app px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => setCanvasZoom(canvasState.zoom - 0.1)}
              title="Zoom Out"
              aria-label="Zoom Out"
              className="p-1 text-text-secondary hover:text-text-primary"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-11 text-center font-mono text-meta text-text-primary">
              {Math.round(canvasState.zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setCanvasZoom(canvasState.zoom + 0.1)}
              title="Zoom In"
              aria-label="Zoom In"
              className="p-1 text-text-secondary hover:text-text-primary"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={resetCanvasView}
              title="Fit to Screen"
              aria-label="Fit to Screen"
              className="p-1 text-text-secondary hover:text-text-primary"
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Viewport Preset Selector */}
          <select
            value={`${viewport.width}x${viewport.height}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number);
              if (w && h) setViewportDimensions(w, h);
            }}
            aria-label="Viewport Preset"
            className="rounded-control border border-border bg-app px-2 py-1 text-meta text-text-secondary focus:border-accent focus:outline-none"
          >
            {VIEWPORT_PRESETS.map((p) => (
              <option key={p.id} value={`${p.width}x${p.height}`}>
                {p.width}×{p.height}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Schema JSON, Copy to Figma & Right Panel Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenSchemaInspector}
            title="Inspect Canonical Layora Design Schema JSON"
            className="inline-flex items-center gap-1 rounded-control border border-border bg-app px-2.5 py-1.5 text-meta font-medium text-text-secondary hover:border-accent hover:text-text-primary"
          >
            <FileJson className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Schema JSON</span>
          </button>

          <div className="inline-flex rounded-control shadow-sm">
            <button
              type="button"
              onClick={handleQuickCopyToFigma}
              className="inline-flex items-center gap-1.5 rounded-l-control bg-accent px-3 py-1.5 text-btn text-white hover:bg-accent-hover transition-colors"
            >
              {quickCopyToast?.ok ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>Copy to Figma</span>
            </button>
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              title="Open Figma Export Compatibility Report & Options"
              className="rounded-r-control border-l border-white/20 bg-accent px-2 py-1.5 text-meta text-white hover:bg-accent-hover"
            >
              Report
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            title={rightPanelOpen ? 'Collapse Inspector Panel' : 'Expand Inspector Panel'}
            className="p-1.5 rounded text-text-secondary hover:bg-panel-muted hover:text-text-primary"
          >
            {rightPanelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {/* Toast Feedback Banner */}
      {quickCopyToast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-control border px-4 py-2.5 shadow-floating text-xs font-medium ${
            quickCopyToast.ok
              ? 'border-success bg-panel text-text-primary'
              : 'border-danger bg-panel text-danger'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              quickCopyToast.ok ? 'bg-success' : 'bg-danger'
            }`}
          />
          <span>{quickCopyToast.message}</span>
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="text-accent underline ml-1"
          >
            View Compatibility Report
          </button>
        </div>
      )}

      {/* MAIN 3-REGION WORKSPACE BODY */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 1. Left Panel: Pages & Layer Hierarchy */}
        {leftPanelOpen && <LayerTreePanel />}

        {/* 2. Center Interactive Canvas */}
        <div
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className={`canvas-dot-grid relative flex-1 overflow-auto p-12 flex items-start justify-center ${
            canvasState.tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          <div
            style={{
              transform: `translate(${canvasState.panX}px, ${canvasState.panY}px) scale(${canvasState.zoom})`,
              transformOrigin: 'top center',
              transition: panning ? 'none' : 'transform 60ms ease-out',
            }}
            className="relative"
          >
            {/* Artboard Header Label */}
            <div className="mb-2 flex items-center justify-between text-meta text-text-secondary select-none">
              <span className="font-medium">
                {doc?.name || 'Artboard'} {pendingRevision ? '(Previewing Proposed Revision)' : ''}
              </span>
              <span className="font-mono">
                {viewport.width} × {viewport.height}
              </span>
            </div>

            {/* Rendered Design Document + Separate SVG Selection Overlay */}
            <div className="relative">
              <DesignRenderer
                schemaDoc={displayedDocument}
                selectedNodeId={selectedNodeId}
                hoveredNodeId={hoveredNodeId}
                onSelectNode={(id) => {
                  if (canvasState.tool === 'select') {
                    setSelectedNodeId(id);
                  }
                }}
                onHoverNode={(id) => {
                  if (canvasState.tool === 'select') {
                    setHoveredNodeId(id);
                  }
                }}
                onInlineTextChange={(nodeId, newText) =>
                  updateNodeById(nodeId, { text: newText })
                }
                designTokens={designSystem}
                interactive={canvasState.tool === 'select'}
                artboardRef={artboardRef}
                zoom={canvasState.zoom}
              />

              <CanvasSelectionOverlay
                artboardRef={artboardRef}
                selectedNodeId={selectedNodeId}
                hoveredNodeId={hoveredNodeId}
                zoom={canvasState.zoom}
                activeDocument={displayedDocument}
                onResizeNode={(nodeId, updates) => updateNodeById(nodeId, updates)}
              />
            </div>
          </div>
        </div>

        {/* 3. Right Panel: Properties Inspector, AI Design Chat & Version History */}
        {rightPanelOpen && (
          <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-panel">
            {/* Contextual Mode Tabs */}
            <div className="grid grid-cols-3 border-b border-border bg-panel-muted p-1">
              {[
                { id: 'properties', label: 'Properties', icon: Sliders },
                { id: 'chat', label: 'AI Chat', icon: Sparkles },
                { id: 'versions', label: 'History', icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = rightTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRightTab(tab.id)}
                    className={`flex items-center justify-center gap-1.5 rounded py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-panel text-accent shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Right Panel Body */}
            <div className="flex-1 overflow-y-auto">
              {rightTab === 'properties' && <PropertiesPanel />}
              {rightTab === 'chat' && <AiDesignChatPanel />}
              {rightTab === 'versions' && <VersionHistoryPanel />}
            </div>
          </aside>
        )}
      </div>

      {/* Figma Export Compatibility & Clipboard Modal */}
      {showExportModal && (
        <FigmaExportModal
          schemaDoc={displayedDocument}
          artboardRef={artboardRef}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Raw Layora Design Schema JSON Inspector Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-dialog border border-border bg-panel p-5 shadow-dialog space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-panel-title text-text-primary">
                  Layora Design Schema v1.0.0 — Canonical JSON Source
                </h2>
                <p className="text-meta text-text-secondary">
                  Direct schema edits are validated with Zod before updating the canvas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSchemaModal(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              rows={18}
              value={schemaEditorText}
              onChange={(e) => setSchemaEditorText(e.target.value)}
              className="w-full rounded border border-border bg-app p-3 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
            />

            {schemaEditorError && (
              <div className="rounded border border-danger/40 bg-danger/10 p-2.5 text-danger">
                <strong>Zod Validation Error:</strong> {schemaEditorError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSchemaModal(false)}
                className="rounded-control border border-border bg-panel px-3 py-1.5 text-text-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyRawSchema}
                className="rounded-control bg-accent px-4 py-1.5 font-medium text-white hover:bg-accent-hover"
              >
                Validate & Update Schema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
