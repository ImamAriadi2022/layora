import { create } from 'zustand';
import {
  createSaasDashboardDocument,
  createFintechMobileDocument,
} from '../core/design-schema/sampleDocuments.js';
import {
  addDocumentPage,
  cloneSchema,
  createDefaultNode,
  deleteNode,
  duplicateNode,
  findNodeById,
  groupNodeInFrame,
  insertNode,
  reorderNode,
  switchDocumentPage,
  ungroupNode,
  updateNode,
} from '../core/design-schema/operations.js';
import { dbDelete, dbGetAll, dbGetById, dbPut, STORES } from '../services/storage/indexedDb.js';

const INITIAL_PROJECTS = [
  {
    id: 'proj_vortex_cloud',
    name: 'Vortex Cloud Console',
    description: 'Enterprise infrastructure monitoring, cluster telemetry, and deployment rollout dashboard.',
    platform: 'Web',
    viewport: { width: 1440, height: 1024 },
    executionMode: 'local',
    selectedAgentId: 'local-deterministic-engine',
    generationMode: 'scratch',
    documentId: 'doc_saas_dashboard',
    createdAt: '2026-11-08T09:00:00.000Z',
    updatedAt: '2026-11-08T10:30:00.000Z',
    lastTaskStatus: 'Completed',
  },
  {
    id: 'proj_kinetix_mobile',
    name: 'Kinetix Treasury Mobile',
    description: 'Multi-currency corporate treasury wallet, FX conversion, and ledger settlement screen.',
    platform: 'Mobile',
    viewport: { width: 390, height: 844 },
    executionMode: 'local',
    selectedAgentId: 'local-deterministic-engine',
    generationMode: 'scratch',
    documentId: 'doc_fintech_mobile',
    createdAt: '2026-11-08T09:15:00.000Z',
    updatedAt: '2026-11-08T10:40:00.000Z',
    lastTaskStatus: 'Completed',
  },
];

export const useProjectStore = create((set, get) => ({
  projects: [],
  activeProjectId: 'proj_vortex_cloud',
  activeDocument: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  undoStack: [],
  redoStack: [],
  versions: [],
  activities: [],
  chatMessages: {},
  pendingRevision: null,
  generationState: {
    running: false,
    stage: 'Idle',
    error: null,
  },
  canvasState: {
    zoom: 0.75,
    panX: 0,
    panY: 0,
    tool: 'select',
  },
  saveStatus: 'Saved',
  loaded: false,

  initProjects: async () => {
    let projects = await dbGetAll(STORES.PROJECTS);
    if (!projects || projects.length === 0) {
      const saasDoc = createSaasDashboardDocument();
      const mobileDoc = createFintechMobileDocument();

      await dbPut(STORES.DOCUMENTS, { id: 'doc_saas_dashboard', schema: saasDoc });
      await dbPut(STORES.DOCUMENTS, { id: 'doc_fintech_mobile', schema: mobileDoc });

      for (const proj of INITIAL_PROJECTS) {
        await dbPut(STORES.PROJECTS, proj);
      }
      projects = INITIAL_PROJECTS;

      const initialVersion = {
        id: 'ver_seed_1',
        projectId: 'proj_vortex_cloud',
        name: 'v1.0 — Initial Generated Layout',
        note: 'Generated from prompt with 3 KPI cards and Recent Deployments panel.',
        source: 'AI Generation',
        createdAt: '2026-11-08T09:00:00.000Z',
        schema: cloneSchema(saasDoc),
      };
      await dbPut(STORES.VERSIONS, initialVersion);

      const seedActivity = {
        id: 'act_seed_1',
        projectId: 'proj_vortex_cloud',
        projectName: 'Vortex Cloud Console',
        action: 'Generated initial Layora Design Schema v1.0.0 (2 pages)',
        status: 'Completed',
        timestamp: '2026-11-08T10:30:00.000Z',
      };
      await dbPut(STORES.ACTIVITY, seedActivity);
    }

    const versions = await dbGetAll(STORES.VERSIONS);
    const activities = await dbGetAll(STORES.ACTIVITY);
    const firstProject = projects[0];
    let activeDoc = null;
    if (firstProject) {
      const storedDoc = await dbGetById(STORES.DOCUMENTS, firstProject.documentId);
      activeDoc = storedDoc?.schema || createSaasDashboardDocument();
    }

    set({
      projects: projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      activeProjectId: firstProject?.id || null,
      activeDocument: activeDoc,
      versions: (versions || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      activities: (activities || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      loaded: true,
    });
  },

  logActivity: async (projectId, projectName, action, status = 'Completed') => {
    const entry = {
      id: `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      projectName,
      action,
      status,
      timestamp: new Date().toISOString(),
    };
    const next = [entry, ...get().activities].slice(0, 40);
    set({ activities: next });
    await dbPut(STORES.ACTIVITY, entry);
  },

  selectProject: async (projectId) => {
    const proj = get().projects.find((p) => p.id === projectId);
    if (!proj) return;
    const stored = await dbGetById(STORES.DOCUMENTS, proj.documentId);
    const doc = stored?.schema || createSaasDashboardDocument();
    const fitZoom = proj.viewport?.width <= 480 ? 0.95 : 0.72;
    set({
      activeProjectId: proj.id,
      activeDocument: doc,
      selectedNodeId: null,
      hoveredNodeId: null,
      undoStack: [],
      redoStack: [],
      pendingRevision: null,
      canvasState: { zoom: fitZoom, panX: 0, panY: 0, tool: 'select' },
      saveStatus: 'Saved',
    });
  },

  createProject: async ({
    name,
    description = '',
    platform = 'Web',
    viewport = { width: 1440, height: 1024 },
    executionMode = 'local',
    selectedAgentId = 'local-deterministic-engine',
    generationMode = 'scratch',
    initialDocument = null,
    sourceReport = null,
  }) => {
    const projectId = `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const documentId = `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const docSchema =
      initialDocument ||
      (platform === 'Mobile' ? createFintechMobileDocument() : createSaasDashboardDocument());
    docSchema.document.id = documentId;
    docSchema.document.name = name;
    docSchema.document.viewport = { ...viewport };

    const newProject = {
      id: projectId,
      name: String(name || 'Untitled Project').trim(),
      description: String(description || '').trim(),
      platform,
      viewport,
      executionMode,
      selectedAgentId,
      generationMode,
      documentId,
      sourceReport: sourceReport || null,
      createdAt: now,
      updatedAt: now,
      lastTaskStatus: 'Completed',
    };

    await dbPut(STORES.DOCUMENTS, { id: documentId, schema: docSchema });
    await dbPut(STORES.PROJECTS, newProject);

    const initialVersion = {
      id: `ver_${Date.now().toString(36)}`,
      projectId,
      name: 'v1.0 — Initial Project Document',
      note:
        generationMode === 'source-code'
          ? 'Reconstructed from source code analysis.'
          : 'Initial design schema generated on project creation.',
      source: generationMode === 'source-code' ? 'Source Code to Design' : 'Create from Scratch',
      createdAt: now,
      schema: cloneSchema(docSchema),
    };
    await dbPut(STORES.VERSIONS, initialVersion);

    const nextProjects = [newProject, ...get().projects];
    const nextVersions = [initialVersion, ...get().versions];

    set({
      projects: nextProjects,
      activeProjectId: projectId,
      activeDocument: docSchema,
      versions: nextVersions,
      selectedNodeId: null,
      undoStack: [],
      redoStack: [],
      pendingRevision: null,
      canvasState: {
        zoom: viewport.width <= 480 ? 0.95 : 0.72,
        panX: 0,
        panY: 0,
        tool: 'select',
      },
    });

    await get().logActivity(projectId, newProject.name, `Created project (${generationMode})`, 'Completed');
    return newProject;
  },

  renameProject: async (projectId, newName, newDescription = undefined) => {
    const now = new Date().toISOString();
    const nextProjects = get().projects.map((p) =>
      p.id === projectId
        ? {
            ...p,
            name: String(newName || p.name).trim(),
            description: newDescription !== undefined ? newDescription : p.description,
            updatedAt: now,
          }
        : p
    );
    set({ projects: nextProjects });
    const updated = nextProjects.find((p) => p.id === projectId);
    if (updated) {
      await dbPut(STORES.PROJECTS, updated);
    }
    if (get().activeProjectId === projectId && get().activeDocument) {
      const nextDoc = cloneSchema(get().activeDocument);
      nextDoc.document.name = String(newName).trim();
      set({ activeDocument: nextDoc });
      await dbPut(STORES.DOCUMENTS, { id: updated.documentId, schema: nextDoc });
    }
  },

  duplicateProject: async (projectId) => {
    const original = get().projects.find((p) => p.id === projectId);
    if (!original) return null;
    const storedDoc = await dbGetById(STORES.DOCUMENTS, original.documentId);
    const clonedSchema = cloneSchema(storedDoc?.schema || createSaasDashboardDocument());

    return get().createProject({
      name: `${original.name} (Copy)`,
      description: original.description,
      platform: original.platform,
      viewport: { ...original.viewport },
      executionMode: original.executionMode,
      selectedAgentId: original.selectedAgentId,
      generationMode: original.generationMode,
      initialDocument: clonedSchema,
    });
  },

  deleteProject: async (projectId) => {
    const target = get().projects.find((p) => p.id === projectId);
    if (!target) return;

    await dbDelete(STORES.PROJECTS, projectId);
    await dbDelete(STORES.DOCUMENTS, target.documentId);

    const remaining = get().projects.filter((p) => p.id !== projectId);
    const remainingVersions = get().versions.filter((v) => v.projectId !== projectId);
    set({ projects: remaining, versions: remainingVersions });

    if (get().activeProjectId === projectId) {
      if (remaining.length > 0) {
        await get().selectProject(remaining[0].id);
      } else {
        set({ activeProjectId: null, activeDocument: null, selectedNodeId: null });
      }
    }
  },

  // Canvas & Selection Controls
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setHoveredNodeId: (nodeId) => set({ hoveredNodeId: nodeId }),

  getSelectedNode: () => {
    const { activeDocument, selectedNodeId } = get();
    if (!activeDocument || !selectedNodeId) return null;
    return findNodeById(activeDocument, selectedNodeId);
  },

  setCanvasZoom: (zoom) =>
    set((state) => ({
      canvasState: {
        ...state.canvasState,
        zoom: Math.min(2.5, Math.max(0.25, Number(zoom.toFixed(2)))),
      },
    })),

  setCanvasPan: (panX, panY) =>
    set((state) => ({
      canvasState: { ...state.canvasState, panX, panY },
    })),

  setCanvasTool: (tool) =>
    set((state) => ({
      canvasState: { ...state.canvasState, tool },
    })),

  resetCanvasView: () => {
    const doc = get().activeDocument;
    const vw = doc?.document?.viewport?.width || 1440;
    set({
      canvasState: {
        zoom: vw <= 480 ? 0.95 : 0.72,
        panX: 0,
        panY: 0,
        tool: 'select',
      },
    });
  },

  // Schema Mutation + Undo/Redo Persistence
  commitDocumentUpdate: async (nextDoc, recordHistory = true) => {
    const currentDoc = get().activeDocument;
    const activeProjectId = get().activeProjectId;
    const activeProject = get().projects.find((p) => p.id === activeProjectId);

    const nextUndo =
      recordHistory && currentDoc ? [...get().undoStack.slice(-29), cloneSchema(currentDoc)] : get().undoStack;

    set({
      activeDocument: nextDoc,
      undoStack: nextUndo,
      redoStack: recordHistory ? [] : get().redoStack,
      saveStatus: 'Saving...',
    });

    if (activeProject) {
      await dbPut(STORES.DOCUMENTS, { id: activeProject.documentId, schema: nextDoc });
      const now = new Date().toISOString();
      const updatedProj = {
        ...activeProject,
        viewport: nextDoc.document.viewport || activeProject.viewport,
        updatedAt: now,
      };
      await dbPut(STORES.PROJECTS, updatedProj);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === activeProject.id ? updatedProj : p)),
        saveStatus: 'Saved',
      }));
    } else {
      set({ saveStatus: 'Saved' });
    }
  },

  undo: async () => {
    const { undoStack, redoStack, activeDocument } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const remainingUndo = undoStack.slice(0, -1);
    const nextRedo = activeDocument ? [cloneSchema(activeDocument), ...redoStack.slice(0, 29)] : redoStack;

    set({
      activeDocument: previous,
      undoStack: remainingUndo,
      redoStack: nextRedo,
    });

    const activeProject = get().projects.find((p) => p.id === get().activeProjectId);
    if (activeProject) {
      await dbPut(STORES.DOCUMENTS, { id: activeProject.documentId, schema: previous });
    }
  },

  redo: async () => {
    const { undoStack, redoStack, activeDocument } = get();
    if (redoStack.length === 0) return;
    const [nextDoc, ...remainingRedo] = redoStack;
    const nextUndo = activeDocument ? [...undoStack, cloneSchema(activeDocument)] : undoStack;

    set({
      activeDocument: nextDoc,
      undoStack: nextUndo,
      redoStack: remainingRedo,
    });

    const activeProject = get().projects.find((p) => p.id === get().activeProjectId);
    if (activeProject) {
      await dbPut(STORES.DOCUMENTS, { id: activeProject.documentId, schema: nextDoc });
    }
  },

  // Node Editor Actions
  updateSelectedNode: async (updates) => {
    const { activeDocument, selectedNodeId } = get();
    if (!activeDocument || !selectedNodeId) return;
    const nextDoc = updateNode(activeDocument, selectedNodeId, updates);
    await get().commitDocumentUpdate(nextDoc, true);
  },

  updateNodeById: async (nodeId, updates) => {
    const { activeDocument } = get();
    if (!activeDocument || !nodeId) return;
    const nextDoc = updateNode(activeDocument, nodeId, updates);
    await get().commitDocumentUpdate(nextDoc, true);
  },

  addNodeToCanvas: async (nodeType, overrides = {}) => {
    const { activeDocument, selectedNodeId } = get();
    if (!activeDocument) return;
    const newNode = createDefaultNode(nodeType, overrides);
    const nextDoc = insertNode(activeDocument, selectedNodeId, newNode);
    await get().commitDocumentUpdate(nextDoc, true);
    set({ selectedNodeId: newNode.id });
    return newNode;
  },

  insertCustomNode: async (nodeObj) => {
    const { activeDocument, selectedNodeId } = get();
    if (!activeDocument || !nodeObj) return;
    const nextDoc = insertNode(activeDocument, selectedNodeId, cloneSchema(nodeObj));
    await get().commitDocumentUpdate(nextDoc, true);
  },

  duplicateSelectedNode: async () => {
    const { activeDocument, selectedNodeId } = get();
    if (!activeDocument || !selectedNodeId) return;
    const { doc, duplicatedId } = duplicateNode(activeDocument, selectedNodeId);
    await get().commitDocumentUpdate(doc, true);
    if (duplicatedId) set({ selectedNodeId: duplicatedId });
  },

  deleteSelectedNode: async () => {
    const { activeDocument, selectedNodeId } = get();
    if (!activeDocument || !selectedNodeId) return;
    const nextDoc = deleteNode(activeDocument, selectedNodeId);
    set({ selectedNodeId: null });
    await get().commitDocumentUpdate(nextDoc, true);
  },

  reorderSelectedNode: async (direction) => {
    const { activeDocument, selectedNodeId } = get();
    if (!activeDocument || !selectedNodeId) return;
    const nextDoc = reorderNode(activeDocument, selectedNodeId, direction);
    await get().commitDocumentUpdate(nextDoc, true);
  },

  groupSelectedNode: async () => {
    const { activeDocument, selectedNodeId } = get();
    if (!activeDocument || !selectedNodeId) return;
    const { doc, groupId } = groupNodeInFrame(activeDocument, selectedNodeId);
    await get().commitDocumentUpdate(doc, true);
    if (groupId) set({ selectedNodeId: groupId });
  },

  ungroupSelectedNode: async () => {
    const { activeDocument, selectedNodeId } = get();
    if (!activeDocument || !selectedNodeId) return;
    const nextDoc = ungroupNode(activeDocument, selectedNodeId);
    await get().commitDocumentUpdate(nextDoc, true);
  },

  // Multi-page & Viewport Actions
  setViewportDimensions: async (width, height) => {
    const { activeDocument } = get();
    if (!activeDocument) return;
    const nextDoc = cloneSchema(activeDocument);
    nextDoc.document.viewport = {
      width: Math.max(240, Number(width || 1440)),
      height: Math.max(240, Number(height || 1024)),
    };
    await get().commitDocumentUpdate(nextDoc, true);
  },

  switchPage: async (pageId) => {
    const { activeDocument } = get();
    if (!activeDocument) return;
    const nextDoc = switchDocumentPage(activeDocument, pageId);
    set({ selectedNodeId: null });
    await get().commitDocumentUpdate(nextDoc, false);
  },

  addPage: async (pageName) => {
    const { activeDocument } = get();
    if (!activeDocument) return;
    const nextDoc = addDocumentPage(activeDocument, pageName);
    set({ selectedNodeId: null });
    await get().commitDocumentUpdate(nextDoc, true);
  },

  // Version History
  saveVersionSnapshot: async ({ name, note = '', source = 'Manual Save' }) => {
    const { activeDocument, activeProjectId, versions } = get();
    if (!activeDocument || !activeProjectId) return null;

    const versionRecord = {
      id: `ver_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: activeProjectId,
      name: name || `Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      note,
      source,
      createdAt: new Date().toISOString(),
      schema: cloneSchema(activeDocument),
    };

    await dbPut(STORES.VERSIONS, versionRecord);
    set({ versions: [versionRecord, ...versions] });
    return versionRecord;
  },

  restoreVersionSnapshot: async (versionId) => {
    const { versions, activeProjectId, activeDocument } = get();
    const targetVersion = versions.find((v) => v.id === versionId);
    if (!targetVersion) return;

    // Automatically save current state before restoring so user work is never lost
    if (activeDocument && activeProjectId) {
      await get().saveVersionSnapshot({
        name: 'Pre-Restore Automatic Backup',
        note: `Saved automatically before restoring "${targetVersion.name}"`,
        source: 'Auto-Snapshot',
      });
    }

    const restoredSchema = cloneSchema(targetVersion.schema);
    await get().commitDocumentUpdate(restoredSchema, true);
    set({ selectedNodeId: null });
  },

  // AI Chat & Revision Review Workflow
  appendChatMessage: (projectId, message) => {
    set((state) => {
      const currentList = state.chatMessages[projectId] || [];
      return {
        chatMessages: {
          ...state.chatMessages,
          [projectId]: [
            ...currentList,
            {
              id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
              timestamp: new Date().toISOString(),
              ...message,
            },
          ],
        },
      };
    });
  },

  stageRevisionForReview: (revisionPayload) => {
    set({ pendingRevision: revisionPayload });
  },

  acceptPendingRevision: async () => {
    const { pendingRevision, activeProjectId } = get();
    if (!pendingRevision) return;

    // Save automatic snapshot before applying AI revision (Section 13 requirement)
    await get().saveVersionSnapshot({
      name: 'Pre-AI Revision Snapshot',
      note: `Automatic backup before applying AI revision: "${pendingRevision.instruction}"`,
      source: 'Auto-Snapshot',
    });

    await get().commitDocumentUpdate(pendingRevision.updatedDocument, true);
    if (activeProjectId) {
      get().appendChatMessage(activeProjectId, {
        role: 'system',
        content: `Applied revision affecting ${pendingRevision.affectedNodes?.length || 1} node(s). Pre-revision snapshot saved in Version History.`,
      });
    }
    set({ pendingRevision: null });
  },

  discardPendingRevision: () => {
    const { pendingRevision, activeProjectId } = get();
    if (pendingRevision && activeProjectId) {
      get().appendChatMessage(activeProjectId, {
        role: 'system',
        content: 'Discarded proposed AI revision. Existing canvas design preserved.',
      });
    }
    set({ pendingRevision: null });
  },

  setGenerationState: (updates) =>
    set((state) => ({
      generationState: { ...state.generationState, ...updates },
    })),
}));
