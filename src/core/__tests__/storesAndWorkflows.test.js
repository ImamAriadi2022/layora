import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { useReferenceStore } from '../../stores/useReferenceStore.js';
import { useAgentStore } from '../../stores/useAgentStore.js';
import { useDesignSystemStore } from '../../stores/useDesignSystemStore.js';
import { resolveNodeTokens } from '../renderer/DesignRenderer.jsx';
import { copyDesignToFigmaClipboard } from '../exporters/figmaExporter.js';
import { findNodeById } from '../design-schema/operations.js';
import DashboardPage from '../../features/dashboard/DashboardPage.jsx';
import NewProjectPage from '../../features/projects/NewProjectPage.jsx';
import WorkspacePage from '../../features/design-canvas/WorkspacePage.jsx';
import ReferenceManagerPage from '../../features/references/ReferenceManagerPage.jsx';
import AiAgentsPage from '../../features/ai-agents/AiAgentsPage.jsx';
import DesignSystemPage from '../../features/design-system/DesignSystemPage.jsx';
import SettingsPage from '../../features/projects/SettingsPage.jsx';

describe('Layora Workflows — Stores, Undo/Redo, Versions, References, Tokens & Export', () => {
  beforeEach(async () => {
    await useProjectStore.getState().initProjects();
    await useReferenceStore.getState().initReferences();
    await useAgentStore.getState().initAgents();
    await useDesignSystemStore.getState().initDesignSystem();
  });

  it('creates, renames, duplicates, and deletes projects with persistence', async () => {
    const store = useProjectStore.getState();
    const initialLen = store.projects.length;

    const created = await store.createProject({
      name: 'Telemetry Portal Test',
      description: 'Test project persistence',
      platform: 'Web',
      viewport: { width: 1440, height: 1024 },
      executionMode: 'local',
      selectedAgentId: 'local-deterministic-engine',
      generationMode: 'scratch',
    });

    expect(useProjectStore.getState().projects.length).toBe(initialLen + 1);
    expect(useProjectStore.getState().activeProjectId).toBe(created.id);

    await useProjectStore.getState().renameProject(created.id, 'Telemetry Portal Renamed');
    expect(
      useProjectStore.getState().projects.find((p) => p.id === created.id).name
    ).toBe('Telemetry Portal Renamed');

    const duplicated = await useProjectStore.getState().duplicateProject(created.id);
    expect(duplicated.name).toContain('Copy');
    expect(duplicated.documentId).not.toBe(created.documentId);

    await useProjectStore.getState().deleteProject(duplicated.id);
    expect(
      useProjectStore.getState().projects.find((p) => p.id === duplicated.id)
    ).toBeUndefined();
  });

  it('handles node selection, property editing, undo, and redo', async () => {
    const store = useProjectStore.getState();
    await store.selectProject('proj_vortex_cloud');

    // Select a text node
    store.setSelectedNodeId('text_page_heading');
    expect(useProjectStore.getState().getSelectedNode().text).toBe(
      'Production Cluster Overview'
    );

    // Edit text and color
    await useProjectStore.getState().updateSelectedNode({
      text: 'Updated Cluster Heading',
      style: { color: '#5B63D3' },
    });

    expect(useProjectStore.getState().getSelectedNode().text).toBe(
      'Updated Cluster Heading'
    );
    expect(useProjectStore.getState().undoStack.length).toBe(1);

    // Undo restores prior state
    await useProjectStore.getState().undo();
    expect(useProjectStore.getState().getSelectedNode().text).toBe(
      'Production Cluster Overview'
    );
    expect(useProjectStore.getState().redoStack.length).toBe(1);

    // Redo re-applies state
    await useProjectStore.getState().redo();
    expect(useProjectStore.getState().getSelectedNode().text).toBe(
      'Updated Cluster Heading'
    );
  });

  it('saves and restores version snapshots without losing current work', async () => {
    const store = useProjectStore.getState();
    await store.selectProject('proj_vortex_cloud');

    const checkpoint = await useProjectStore.getState().saveVersionSnapshot({
      name: 'v1.1 — Before Heading Edit',
      note: 'Testing version restore safety',
      source: 'Manual Save',
    });

    // Make an edit after saving the checkpoint
    await useProjectStore.getState().updateNodeById('text_page_heading', {
      text: 'Temporary Experimental Title',
    });
    expect(
      findNodeById(useProjectStore.getState().activeDocument, 'text_page_heading').text
    ).toBe('Temporary Experimental Title');

    const versionsCountBeforeRestore = useProjectStore.getState().versions.length;

    // Restore checkpoint
    await useProjectStore.getState().restoreVersionSnapshot(checkpoint.id);

    // Verify title is restored AND an automatic pre-restore backup was created
    expect(
      findNodeById(useProjectStore.getState().activeDocument, 'text_page_heading').text
    ).not.toBe('Temporary Experimental Title');
    expect(useProjectStore.getState().versions.length).toBe(
      versionsCountBeforeRestore + 1
    );
  });

  it('manages references and task attachment states', async () => {
    const refStore = useReferenceStore.getState();
    const added = await refStore.addReference({
      name: 'Custom Component Spec',
      type: 'component',
      projectId: 'proj_vortex_cloud',
      source: 'https://example.com/spec',
      notes: 'Use 8px border radius',
      attachedToTask: true,
    });

    expect(added.attachedToTask).toBe(true);
    await useReferenceStore.getState().toggleReferenceTaskAttachment(added.id);
    const updated = useReferenceStore
      .getState()
      .references.find((r) => r.id === added.id);
    expect(updated.attachedToTask).toBe(false);
  });

  it('handles agent connection errors gracefully without crashing', async () => {
    const agentStore = useAgentStore.getState();
    // Test unconfigured API agent
    const res = await agentStore.testConnection('api-gemini');
    expect(res).not.toBeNull();
    expect(res.connected).toBe(false);
    expect(res.message).toMatch(/API key/i);
  });

  it('resolves linked Design System tokens dynamically on nodes', async () => {
    const dsStore = useDesignSystemStore.getState();
    const sampleNode = {
      id: 'node_tok_1',
      type: 'FRAME',
      name: 'Tokenized Card',
      style: { background: '#000000', borderRadius: 2 },
      tokenRefs: {
        'style.background': 'token_color_accent',
        'style.borderRadius': 'token_radius_md',
      },
    };

    const resolvedBefore = resolveNodeTokens(sampleNode, dsStore.designSystem);
    expect(resolvedBefore.style.background).toBe('#5B63D3');
    expect(resolvedBefore.style.borderRadius).toBe(10);

    // Update token in Design System store
    await dsStore.updateToken('colors', 'token_color_accent', { value: '#10B981' });
    const resolvedAfter = resolveNodeTokens(
      sampleNode,
      useDesignSystemStore.getState().designSystem
    );
    expect(resolvedAfter.style.background).toBe('#10B981');
  });

  it('executes Figma clipboard export and returns compatibility report + SVG payload', async () => {
    const doc = useProjectStore.getState().activeDocument;
    // Provide mock clipboard in headless test environment
    let clipboardTextWritten = '';
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {
        writeText: async (txt) => {
          clipboardTextWritten = txt;
        },
      },
      configurable: true,
    });

    const exportRes = await copyDesignToFigmaClipboard(doc, null);
    expect(exportRes.success).toBe(true);
    expect(exportRes.compatibility.compatible).toBe(true);
    expect(clipboardTextWritten).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(clipboardTextWritten).toContain('Vortex Cloud');
  });

  it('renders all 7 application screens without React or Zustand selector errors', () => {
    const pages = [
      { name: 'DashboardPage', comp: DashboardPage, route: '/' },
      { name: 'NewProjectPage', comp: NewProjectPage, route: '/projects/new' },
      { name: 'WorkspacePage', comp: WorkspacePage, route: '/workspace' },
      { name: 'ReferenceManagerPage', comp: ReferenceManagerPage, route: '/references' },
      { name: 'AiAgentsPage', comp: AiAgentsPage, route: '/agents' },
      { name: 'DesignSystemPage', comp: DesignSystemPage, route: '/design-system' },
      { name: 'SettingsPage', comp: SettingsPage, route: '/settings' },
    ];

    for (const p of pages) {
      const html = renderToString(
        React.createElement(
          MemoryRouter,
          { initialEntries: [p.route] },
          React.createElement(p.comp)
        )
      );
      expect(html.length).toBeGreaterThan(100);
    }
  });
});
