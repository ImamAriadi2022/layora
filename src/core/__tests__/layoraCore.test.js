import { describe, it, expect } from 'vitest';
import {
  createSaasDashboardDocument,
  createFintechMobileDocument,
} from '../design-schema/sampleDocuments.js';
import {
  createDefaultNode,
  findNodeById,
  insertNode,
  updateNode,
  deleteNode,
  duplicateNode,
  reorderNode,
  groupNodeInFrame,
  ungroupNode,
  addDocumentPage,
  switchDocumentPage,
  flattenNodes,
} from '../design-schema/operations.js';
import { NODE_TYPES } from '../design-schema/schema.js';
import { normalizeAndValidateSchema } from '../validator/validator.js';
import {
  analyzeFigmaCompatibility,
  computeDeterministicLayout,
  generateFigmaSvg,
} from '../exporters/figmaExporter.js';
import {
  synthesizeSchemaFromBrief,
  applyDeterministicRevision,
} from '../../services/ai-providers/schemaSynthesizer.js';
import { analyzeSourceFilesMap } from '../../services/local-bridge/sourceCodeAnalyzer.js';

describe('Layora Core Engine — Schema, Validator, Tree Ops, AI & Figma Exporter', () => {
  it('validates canonical sample documents without errors', () => {
    const saas = createSaasDashboardDocument();
    const res1 = normalizeAndValidateSchema(saas);
    expect(res1.valid).toBe(true);
    expect(res1.document.schemaVersion).toBe('1.0.0');
    expect(res1.diagnostics.nodeCount).toBeGreaterThan(20);

    const mobile = createFintechMobileDocument();
    const res2 = normalizeAndValidateSchema(mobile);
    expect(res2.valid).toBe(true);
    expect(res2.document.document.viewport.width).toBe(390);
  });

  it('normalizes and repairs untrusted AI markdown JSON output with duplicate IDs and alias types', () => {
    const untrustedAiOutput = `\`\`\`json
    {
      "id": "legacy_doc",
      "name": "Untrusted AI Layout",
      "children": [
        {
          "id": "dup_1",
          "type": "div",
          "name": "Card Container",
          "layout": { "mode": "row", "gap": 16 },
          "children": [
            {
              "id": "dup_1",
              "type": "heading",
              "text": "Revenue Overview",
              "children": [{ "id": "illegal_leaf_child", "type": "span", "text": "Ignored" }]
            }
          ]
        }
      ]
    }
    \`\`\``;

    const validated = normalizeAndValidateSchema(untrustedAiOutput);
    expect(validated.valid).toBe(true);
    expect(validated.diagnostics.repairedCount).toBeGreaterThanOrEqual(3);

    const rootFrame = validated.document.document.children[0];
    expect(rootFrame.type).toBe(NODE_TYPES.FRAME);
    expect(rootFrame.layout.mode).toBe('HORIZONTAL');

    const childText = rootFrame.children[0];
    expect(childText.type).toBe(NODE_TYPES.TEXT);
    expect(childText.id).not.toBe(rootFrame.id); // Deduplicated ID
    expect(childText.children).toBeUndefined(); // Stripped leaf children
  });

  it('supports insert, update, duplicate, reorder, group/ungroup, and delete operations', () => {
    let doc = createSaasDashboardDocument();
    const initialCount = flattenNodes(doc).length;

    // 1. Insert new node into frame_main_area
    const newBadge = createDefaultNode(NODE_TYPES.TEXT, {
      name: 'Release Badge',
      text: 'v2.4 Live',
    });
    doc = insertNode(doc, 'frame_main_area', newBadge);
    expect(findNodeById(doc, newBadge.id)).not.toBeNull();
    expect(flattenNodes(doc).length).toBe(initialCount + 1);

    // 2. Update node property
    doc = updateNode(doc, newBadge.id, {
      text: 'v2.5 Production',
      style: { color: '#21845A' },
    });
    expect(findNodeById(doc, newBadge.id).text).toBe('v2.5 Production');
    expect(findNodeById(doc, newBadge.id).style.color).toBe('#21845A');

    // 3. Duplicate node
    const dupResult = duplicateNode(doc, newBadge.id);
    doc = dupResult.doc;
    expect(dupResult.duplicatedId).toBeTruthy();
    expect(dupResult.duplicatedId).not.toBe(newBadge.id);

    // 4. Reorder node
    doc = reorderNode(doc, dupResult.duplicatedId, 'FIRST');
    const mainArea = findNodeById(doc, 'frame_main_area');
    expect(mainArea.children[0].id).toBe(dupResult.duplicatedId);

    // 5. Group and Ungroup
    const grp = groupNodeInFrame(doc, newBadge.id);
    doc = grp.doc;
    expect(findNodeById(doc, grp.groupId).type).toBe(NODE_TYPES.GROUP);
    doc = ungroupNode(doc, grp.groupId);
    expect(findNodeById(doc, grp.groupId)).toBeNull();
    expect(findNodeById(doc, newBadge.id)).not.toBeNull();

    // 6. Delete node
    doc = deleteNode(doc, dupResult.duplicatedId);
    expect(findNodeById(doc, dupResult.duplicatedId)).toBeNull();
  });

  it('supports multi-page creation and switching', () => {
    let doc = createSaasDashboardDocument();
    doc = addDocumentPage(doc, 'Audit Logs Screen', { width: 1440, height: 1024 });
    expect(doc.document.pages.length).toBe(3);
    expect(doc.document.children[0].name).toContain('Audit Logs Screen');

    doc = switchDocumentPage(doc, 'page_overview');
    expect(doc.document.activePageId).toBe('page_overview');
    expect(findNodeById(doc, 'frame_sidebar')).not.toBeNull();
  });

  it('synthesizes valid schema from scratch and applies scoped AI revisions while preserving unrelated nodes', () => {
    const generated = synthesizeSchemaFromBrief({
      prompt: 'Design an enterprise dark mode Kubernetes telemetry dashboard',
      projectName: 'KubePulse',
      platform: 'Web',
      viewport: { width: 1440, height: 1024 },
    });
    expect(generated.schemaVersion).toBe('1.0.0');
    expect(generated.document.children.length).toBeGreaterThan(0);

    const baseDoc = createSaasDashboardDocument();
    const revision = applyDeterministicRevision({
      schemaDoc: baseDoc,
      instruction: 'Make the sidebar narrower and add a data table below the metrics',
      scope: 'page',
    });

    expect(revision.affectedNodes.length).toBeGreaterThanOrEqual(2);
    const updatedSidebar = findNodeById(revision.updatedDocument, 'frame_sidebar');
    expect(updatedSidebar.width).toBeLessThan(248);
    // Unrelated node preserved
    expect(findNodeById(revision.updatedDocument, 'text_brand_title').text).toBe('Vortex Cloud');
  });

  it('reconstructs source code files into a valid multi-page Layora Design Schema document', () => {
    const filesMap = {
      'package.json': JSON.stringify({
        name: 'nexus-crm',
        dependencies: { react: '^18.3.1', tailwindcss: '^3.4.0' },
      }),
      'src/pages/ContactsPage.jsx': 'export function ContactsPage() { return <div><h1>Customer Directory</h1></div>; }',
      'src/pages/DealsPipeline.jsx': 'export function DealsPipeline() { return <div><h1>Active Deals</h1></div>; }',
      'src/components/ContactTable.jsx': 'export function ContactTable() {}',
      'src/styles/app.css': '.btn { background: #4F46E5; }',
    };

    const { document, report } = analyzeSourceFilesMap(filesMap, 'nexus-crm');
    expect(report.framework).toContain('React');
    expect(report.stylingSystem).toBe('Tailwind CSS');
    expect(report.discoveredRoutes.length).toBe(2);
    expect(report.extractedColors).toContain('#4F46E5');
    expect(document.document.pages.length).toBe(2);
  });

  it('produces verified Figma Clipboard SVG with editable <text>, <rect>, <ellipse>, and nested <g> hierarchy', () => {
    const doc = createSaasDashboardDocument();
    const compatibility = analyzeFigmaCompatibility(doc);

    expect(compatibility.compatible).toBe(true);
    expect(compatibility.supportedCount).toBe(compatibility.totalNodes);
    expect(compatibility.textEditable).toBe(true);
    expect(compatibility.approximatedProperties.length).toBeGreaterThan(0);

    const layoutMap = computeDeterministicLayout(doc);
    expect(layoutMap.size).toBe(compatibility.totalNodes);

    const sidebarBox = layoutMap.get('frame_sidebar');
    expect(sidebarBox.width).toBe(248);
    expect(sidebarBox.height).toBe(1024);

    const svg = generateFigmaSvg(doc, layoutMap);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('<g id="Sidebar Navigation">');
    expect(svg).toContain('<text id="Brand Name"');
    expect(svg).toContain('Vortex Cloud</text>');
    expect(svg).toContain('<rect id="Brand Mark"');
    expect(svg).toContain('<ellipse id="Active Indicator"');
  });
});
