import { generateNodeId, NODE_TYPES, SCHEMA_VERSION } from '../../core/design-schema/schema.js';
import { cloneSchema, findNodeById, traverseTree } from '../../core/design-schema/operations.js';
import { normalizeAndValidateSchema } from '../../core/validator/validator.js';

export function buildLayoraSystemPrompt() {
  return `You are the Layora Design Schema Architect.
You MUST output ONLY valid JSON conforming to the Layora Design Schema v1.0.0.
Never output markdown explanations or raw HTML/CSS.

Canonical Schema Envelope:
{
  "schemaVersion": "1.0.0",
  "document": {
    "id": "doc_id",
    "name": "Document Name",
    "viewport": { "width": 1440, "height": 1024 },
    "background": "#F8FAFC",
    "children": [ ...nodes ]
  }
}

Supported Node Types:
- FRAME (Container, section, card, sidebar, header, row, button, input; supports children and layout: { mode: "VERTICAL" | "HORIZONTAL" | "NONE", gap: number, padding: number | {top,right,bottom,left}, alignment: "START"|"CENTER"|"END"|"SPACE_BETWEEN", crossAlignment: "START"|"CENTER"|"END"|"STRETCH" })
- TEXT (Typography element; requires "text": string and "typography": { fontFamily: "Inter", fontSize: number, fontWeight: number, lineHeight: number, textAlign: "LEFT"|"CENTER"|"RIGHT" }, style: { color: "#HEX" })
- RECTANGLE (Geometric block/divider/bar; width, height, style: { background: "#HEX", borderRadius: number })
- ELLIPSE (Circular indicator/avatar; width, height, style: { background: "#HEX" })
- IMAGE (Visual asset; width, height, asset: { src: "https://...", fit: "COVER"|"CONTAIN", alt: "..." })
- VECTOR (Icon path; width, height, asset: { svgPath: "..." }, style: { color: "#HEX" })
- GROUP (Logical grouping of children)
- COMPONENT_INSTANCE (Reusable UI component instance with componentId and children)

Design Rules:
1. Use clean, restrained, professional UI design (neutral surfaces, clear typography hierarchy, 1px subtle borders, balanced spacing).
2. Ensure every node has a unique "id", descriptive "name", and valid "type".`;
}

export function buildGenerationUserPrompt({
  prompt,
  platform = 'Web',
  viewport = { width: 1440, height: 1024 },
  constraints = '',
  references = [],
  designTokens = null,
}) {
  const refSummary =
    references.length > 0
      ? references
          .map(
            (r, idx) =>
              `  ${idx + 1}. [${r.type.toUpperCase()}] "${r.name}" (${r.source || 'local'})${
                r.notes ? ` — Notes: ${r.notes}` : ''
              }`
          )
          .join('\n')
      : '  None attached';

  const tokenSummary = designTokens
    ? `Primary Accent: ${designTokens.colors?.find((c) => c.name.toLowerCase().includes('accent'))?.value || '#5B63D3'}`
    : 'Default Layora Neutral Palette';

  return `Task: Create a complete, structured UI design in Layora Design Schema v1.0.0.
Target Platform: ${platform}
Target Viewport: ${viewport.width}x${viewport.height}
Design Request: ${prompt}
Additional Constraints: ${constraints || 'Clean professional layout, high legibility, semantic layer hierarchy'}
Design System Context: ${tokenSummary}
Attached Project References:
${refSummary}

Return ONLY the complete JSON object matching Layora Design Schema v1.0.0.`;
}

export function buildRevisionUserPrompt({
  instruction,
  currentDocument,
  selectedNodeId = null,
  scope = 'page',
}) {
  const targetNode =
    scope === 'selected' && selectedNodeId
      ? findNodeById(currentDocument, selectedNodeId)
      : null;

  return `Task: Revise the existing Layora Design Schema document according to the user's instruction.
Scope: ${targetNode ? `Selected Node Only ("${targetNode.name}", id: "${targetNode.id}")` : 'Whole Page Document'}
User Instruction: "${instruction}"

Current Document JSON:
${JSON.stringify(currentDocument, null, 2)}

Requirements:
1. Preserve unrelated nodes and their IDs.
2. Return the FULL updated Layora Design Schema v1.0.0 JSON document.`;
}

/**
 * Deterministic Schema Synthesizer (Used when user explicitly selects the Local Deterministic Schema Engine
 * or during offline blueprint generation). Builds tailored, structured Layora Design Schema trees
 * based on prompt semantics, target viewport, references, and design tokens.
 */
export function synthesizeSchemaFromBrief({
  prompt = '',
  projectName = 'Untitled Project',
  platform = 'Web',
  viewport = { width: 1440, height: 1024 },
  references = [],
  designTokens = null,
}) {
  const lower = String(prompt || projectName).toLowerCase();
  const isMobile = platform === 'Mobile' || viewport.width <= 480;
  const isDarkRequested =
    lower.includes('dark') || lower.includes('cyber') || lower.includes('terminal') || lower.includes('night');
  const isEcommerce =
    lower.includes('shop') ||
    lower.includes('store') ||
    lower.includes('commerce') ||
    lower.includes('product') ||
    lower.includes('checkout') ||
    lower.includes('fashion');
  const isDocsOrBlog =
    lower.includes('doc') ||
    lower.includes('wiki') ||
    lower.includes('article') ||
    lower.includes('knowledge') ||
    lower.includes('api');

  const accentColor =
    designTokens?.colors?.find((c) => c.id === 'token_color_accent')?.value || '#5B63D3';

  const bgSurface = isDarkRequested ? '#0F172A' : '#F8FAFC';
  const cardSurface = isDarkRequested ? '#1E293B' : '#FFFFFF';
  const borderColor = isDarkRequested ? '#334155' : '#E2E8F0';
  const textPrimary = isDarkRequested ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDarkRequested ? '#94A3B8' : '#64748B';

  const titleText =
    prompt.trim().length > 4
      ? prompt.trim().slice(0, 56) + (prompt.trim().length > 56 ? '...' : '')
      : projectName;

  if (isMobile) {
    const mobileDoc = {
      schemaVersion: SCHEMA_VERSION,
      document: {
        id: generateNodeId('doc'),
        name: projectName || 'Mobile Interface',
        viewport: { width: viewport.width || 390, height: viewport.height || 844 },
        background: bgSurface,
        children: [
          {
            id: generateNodeId('frame'),
            type: NODE_TYPES.FRAME,
            name: 'Mobile Screen Container',
            width: viewport.width || 390,
            height: viewport.height || 844,
            layout: {
              mode: 'VERTICAL',
              gap: 16,
              padding: 20,
              alignment: 'START',
              crossAlignment: 'STRETCH',
              widthMode: 'FIXED',
              heightMode: 'FIXED',
            },
            style: { background: bgSurface },
            children: [
              {
                id: generateNodeId('frame'),
                type: NODE_TYPES.FRAME,
                name: 'Mobile Top Navigation',
                width: 'FILL',
                height: 'HUG',
                layout: {
                  mode: 'HORIZONTAL',
                  gap: 12,
                  padding: { top: 4, right: 0, bottom: 8, left: 0 },
                  alignment: 'SPACE_BETWEEN',
                  crossAlignment: 'CENTER',
                  widthMode: 'FILL',
                  heightMode: 'HUG',
                },
                style: {},
                children: [
                  {
                    id: generateNodeId('text'),
                    type: NODE_TYPES.TEXT,
                    name: 'Screen Title',
                    text: projectName || 'Mobile Workspace',
                    style: { color: textPrimary },
                    typography: { fontFamily: 'Inter', fontSize: 18, fontWeight: 600 },
                  },
                  {
                    id: generateNodeId('ellipse'),
                    type: NODE_TYPES.ELLIPSE,
                    name: 'Profile Indicator',
                    width: 32,
                    height: 32,
                    style: { background: accentColor },
                  },
                ],
              },
              {
                id: generateNodeId('frame'),
                type: NODE_TYPES.FRAME,
                name: 'Primary Feature Card',
                width: 'FILL',
                height: 'HUG',
                layout: {
                  mode: 'VERTICAL',
                  gap: 10,
                  padding: 20,
                  alignment: 'START',
                  crossAlignment: 'START',
                  widthMode: 'FILL',
                  heightMode: 'HUG',
                },
                style: {
                  background: accentColor,
                  borderRadius: 14,
                },
                children: [
                  {
                    id: generateNodeId('text'),
                    type: NODE_TYPES.TEXT,
                    name: 'Feature Tag',
                    text: 'OVERVIEW',
                    style: { color: '#E0E7FF' },
                    typography: { fontFamily: 'Inter', fontSize: 11, fontWeight: 600, letterSpacing: 0.6 },
                  },
                  {
                    id: generateNodeId('text'),
                    type: NODE_TYPES.TEXT,
                    name: 'Feature Headline',
                    text: titleText,
                    style: { color: '#FFFFFF' },
                    typography: { fontFamily: 'Inter', fontSize: 18, fontWeight: 600, lineHeight: 1.35 },
                  },
                ],
              },
              {
                id: generateNodeId('frame'),
                type: NODE_TYPES.FRAME,
                name: 'Content Cards Stack',
                width: 'FILL',
                height: 'HUG',
                layout: {
                  mode: 'VERTICAL',
                  gap: 12,
                  padding: 0,
                  alignment: 'START',
                  crossAlignment: 'STRETCH',
                  widthMode: 'FILL',
                  heightMode: 'HUG',
                },
                style: {},
                children: [1, 2, 3].map((idx) => ({
                  id: generateNodeId('frame'),
                  type: NODE_TYPES.FRAME,
                  name: `Activity Item ${idx}`,
                  width: 'FILL',
                  height: 'HUG',
                  layout: {
                    mode: 'VERTICAL',
                    gap: 6,
                    padding: 16,
                    alignment: 'START',
                    crossAlignment: 'START',
                    widthMode: 'FILL',
                    heightMode: 'HUG',
                  },
                  style: {
                    background: cardSurface,
                    borderColor,
                    borderWidth: 1,
                    borderRadius: 10,
                  },
                  children: [
                    {
                      id: generateNodeId('text'),
                      type: NODE_TYPES.TEXT,
                      name: `Item ${idx} Title`,
                      text: idx === 1 ? 'Primary Workflow Module' : idx === 2 ? 'Realtime Sync Status' : 'Recent User Activity',
                      style: { color: textPrimary },
                      typography: { fontFamily: 'Inter', fontSize: 14, fontWeight: 600 },
                    },
                    {
                      id: generateNodeId('text'),
                      type: NODE_TYPES.TEXT,
                      name: `Item ${idx} Subtitle`,
                      text: 'Structured layout node ready for visual editing and Figma clipboard export.',
                      style: { color: textSecondary },
                      typography: { fontFamily: 'Inter', fontSize: 12, fontWeight: 400 },
                    },
                  ],
                })),
              },
            ],
          },
        ],
      },
    };
    return normalizeAndValidateSchema(mobileDoc).document;
  }

  // Desktop / Tablet Web Layout
  const webDoc = {
    schemaVersion: SCHEMA_VERSION,
    document: {
      id: generateNodeId('doc'),
      name: projectName || 'Web Application Design',
      viewport: { width: viewport.width || 1440, height: viewport.height || 1024 },
      background: bgSurface,
      children: [
        {
          id: generateNodeId('frame'),
          type: NODE_TYPES.FRAME,
          name: 'Page Root Frame',
          width: viewport.width || 1440,
          height: viewport.height || 1024,
          layout: {
            mode: 'VERTICAL',
            gap: 0,
            padding: 0,
            alignment: 'START',
            crossAlignment: 'STRETCH',
            widthMode: 'FIXED',
            heightMode: 'FIXED',
          },
          style: { background: bgSurface },
          children: [
            // Top Navigation Bar
            {
              id: generateNodeId('frame'),
              type: NODE_TYPES.FRAME,
              name: 'Top Navigation Header',
              width: 'FILL',
              height: 68,
              layout: {
                mode: 'HORIZONTAL',
                gap: 24,
                padding: { top: 14, right: 32, bottom: 14, left: 32 },
                alignment: 'SPACE_BETWEEN',
                crossAlignment: 'CENTER',
                widthMode: 'FILL',
                heightMode: 'FIXED',
              },
              style: {
                background: cardSurface,
                borderColor,
                borderWidth: 1,
              },
              children: [
                {
                  id: generateNodeId('frame'),
                  type: NODE_TYPES.FRAME,
                  name: 'Brand & Navigation Group',
                  width: 'HUG',
                  height: 'HUG',
                  layout: {
                    mode: 'HORIZONTAL',
                    gap: 12,
                    padding: 0,
                    alignment: 'START',
                    crossAlignment: 'CENTER',
                  },
                  style: {},
                  children: [
                    {
                      id: generateNodeId('rect'),
                      type: NODE_TYPES.RECTANGLE,
                      name: 'Brand Icon Mark',
                      width: 26,
                      height: 26,
                      style: { background: accentColor, borderRadius: 6 },
                    },
                    {
                      id: generateNodeId('text'),
                      type: NODE_TYPES.TEXT,
                      name: 'Application Name',
                      text: projectName || 'Workspace App',
                      style: { color: textPrimary },
                      typography: { fontFamily: 'Inter', fontSize: 15, fontWeight: 600 },
                    },
                  ],
                },
                {
                  id: generateNodeId('comp'),
                  type: NODE_TYPES.COMPONENT_INSTANCE,
                  name: 'Header CTA Button',
                  componentId: 'comp_button_primary',
                  width: 'HUG',
                  height: 'HUG',
                  layout: {
                    mode: 'HORIZONTAL',
                    gap: 8,
                    padding: { top: 8, right: 16, bottom: 8, left: 16 },
                    alignment: 'CENTER',
                    crossAlignment: 'CENTER',
                  },
                  style: {
                    background: accentColor,
                    borderRadius: 6,
                  },
                  children: [
                    {
                      id: generateNodeId('text'),
                      type: NODE_TYPES.TEXT,
                      name: 'CTA Label',
                      text: isEcommerce ? 'Checkout Now' : isDocsOrBlog ? 'API Reference' : 'Create Resource',
                      style: { color: '#FFFFFF' },
                      typography: { fontFamily: 'Inter', fontSize: 13, fontWeight: 500 },
                    },
                  ],
                },
              ],
            },
            // Main Workspace Body
            {
              id: generateNodeId('frame'),
              type: NODE_TYPES.FRAME,
              name: 'Main Content Container',
              width: 'FILL',
              height: 'FILL',
              layout: {
                mode: 'VERTICAL',
                gap: 28,
                padding: 40,
                alignment: 'START',
                crossAlignment: 'STRETCH',
                widthMode: 'FILL',
                heightMode: 'FILL',
              },
              style: {},
              children: [
                {
                  id: generateNodeId('frame'),
                  type: NODE_TYPES.FRAME,
                  name: 'Hero Banner Section',
                  width: 'FILL',
                  height: 'HUG',
                  layout: {
                    mode: 'VERTICAL',
                    gap: 8,
                    padding: 28,
                    alignment: 'START',
                    crossAlignment: 'START',
                    widthMode: 'FILL',
                    heightMode: 'HUG',
                  },
                  style: {
                    background: cardSurface,
                    borderColor,
                    borderWidth: 1,
                    borderRadius: 12,
                  },
                  children: [
                    {
                      id: generateNodeId('text'),
                      type: NODE_TYPES.TEXT,
                      name: 'Section Eyebrow',
                      text: isEcommerce
                        ? 'CURATED CATALOG'
                        : isDocsOrBlog
                        ? 'DEVELOPER DOCUMENTATION'
                        : 'OPERATIONAL WORKSPACE',
                      style: { color: accentColor },
                      typography: { fontFamily: 'Inter', fontSize: 11, fontWeight: 600, letterSpacing: 0.6 },
                    },
                    {
                      id: generateNodeId('text'),
                      type: NODE_TYPES.TEXT,
                      name: 'Primary Heading',
                      text: titleText,
                      style: { color: textPrimary },
                      typography: { fontFamily: 'Inter', fontSize: 24, fontWeight: 600 },
                    },
                    {
                      id: generateNodeId('text'),
                      type: NODE_TYPES.TEXT,
                      name: 'Supporting Description',
                      text:
                        prompt.trim() ||
                        'Structured interface generated in Layora Design Schema v1.0.0 with editable frames, typography, and layout constraints.',
                      style: { color: textSecondary },
                      typography: { fontFamily: 'Inter', fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
                    },
                  ],
                },
                {
                  id: generateNodeId('frame'),
                  type: NODE_TYPES.FRAME,
                  name: 'Feature Grid Row',
                  width: 'FILL',
                  height: 'HUG',
                  layout: {
                    mode: 'HORIZONTAL',
                    gap: 20,
                    padding: 0,
                    alignment: 'START',
                    crossAlignment: 'STRETCH',
                    widthMode: 'FILL',
                    heightMode: 'HUG',
                  },
                  style: {},
                  children: [
                    {
                      title: isEcommerce ? 'Featured Product Tier' : 'System Performance',
                      metric: isEcommerce ? '$249.00' : '99.94%',
                      caption: 'Updated in real-time with schema-level precision.',
                    },
                    {
                      title: isEcommerce ? 'Active Inventory' : 'Throughput Capacity',
                      metric: isEcommerce ? '1,420 Units' : '14.2k req/s',
                      caption: 'Verified across active regional endpoints.',
                    },
                    {
                      title: isEcommerce ? 'Customer Satisfaction' : 'Active Integrations',
                      metric: isEcommerce ? '4.92 / 5.0' : '18 Connected',
                      caption:
                        references.length > 0
                          ? `Context informed by ${references.length} attached project reference(s).`
                          : 'Ready for direct inspection and Figma export.',
                    },
                  ].map((item, idx) => ({
                    id: generateNodeId('frame'),
                    type: NODE_TYPES.FRAME,
                    name: `Card ${idx + 1} — ${item.title}`,
                    width: 400,
                    height: 'HUG',
                    layout: {
                      mode: 'VERTICAL',
                      gap: 10,
                      padding: 24,
                      alignment: 'START',
                      crossAlignment: 'START',
                      widthMode: 'FILL',
                      heightMode: 'HUG',
                    },
                    style: {
                      background: cardSurface,
                      borderColor,
                      borderWidth: 1,
                      borderRadius: 10,
                    },
                    children: [
                      {
                        id: generateNodeId('text'),
                        type: NODE_TYPES.TEXT,
                        name: `${item.title} Label`,
                        text: item.title,
                        style: { color: textSecondary },
                        typography: { fontFamily: 'Inter', fontSize: 12, fontWeight: 500 },
                      },
                      {
                        id: generateNodeId('text'),
                        type: NODE_TYPES.TEXT,
                        name: `${item.title} Value`,
                        text: item.metric,
                        style: { color: textPrimary },
                        typography: { fontFamily: 'Inter', fontSize: 26, fontWeight: 600 },
                      },
                      {
                        id: generateNodeId('text'),
                        type: NODE_TYPES.TEXT,
                        name: `${item.title} Note`,
                        text: item.caption,
                        style: { color: textSecondary },
                        typography: { fontFamily: 'Inter', fontSize: 12, fontWeight: 400 },
                      },
                    ],
                  })),
                },
              ],
            },
          ],
        },
      ],
    },
  };

  return normalizeAndValidateSchema(webDoc).document;
}

/**
 * Applies a natural-language revision to a Layora Design Schema document,
 * returning { updatedDocument, affectedNodes, summary }.
 * Supports scoped revisions (selected node only) and whole-page revisions.
 */
export function applyDeterministicRevision({
  schemaDoc,
  instruction = '',
  selectedNodeId = null,
  scope = 'page',
}) {
  const next = cloneSchema(schemaDoc);
  const lower = String(instruction).toLowerCase();
  const affectedNodes = [];
  const changesSummary = [];

  const targetRoot =
    scope === 'selected' && selectedNodeId
      ? findNodeById(next.document.children, selectedNodeId)
      : null;

  const nodesToInspect = targetRoot ? [targetRoot] : next.document.children;

  // Color detection
  const colorMappings = [
    { keywords: ['dark blue', 'biru tua', 'navy'], hex: '#1E3A8A', label: 'Dark Blue (#1E3A8A)' },
    { keywords: ['blue', 'biru'], hex: '#2563EB', label: 'Blue (#2563EB)' },
    { keywords: ['emerald', 'green', 'hijau'], hex: '#10B981', label: 'Emerald (#10B981)' },
    { keywords: ['slate', 'dark', 'gelap'], hex: '#0F172A', label: 'Dark Slate (#0F172A)' },
    { keywords: ['indigo', 'ungu', 'purple'], hex: '#5B63D3', label: 'Indigo (#5B63D3)' },
    { keywords: ['light', 'terang', 'white', 'putih'], hex: '#FFFFFF', label: 'White (#FFFFFF)' },
    { keywords: ['red', 'merah', 'danger'], hex: '#DC2626', label: 'Red (#DC2626)' },
  ];
  const matchedColor = colorMappings.find((c) => c.keywords.some((k) => lower.includes(k)));

  // Compact / spacing detection
  const wantsCompact =
    lower.includes('compact') ||
    lower.includes('narrow') ||
    lower.includes('minimal') ||
    lower.includes('smaller') ||
    lower.includes('rapat') ||
    lower.includes('kecil');

  const wantsSpacious =
    lower.includes('spacious') ||
    lower.includes('wider') ||
    lower.includes('larger') ||
    lower.includes('lebar') ||
    lower.includes('besar');

  const wantsVerticalStack =
    lower.includes('vertical') ||
    lower.includes('stack') ||
    lower.includes('responsive') ||
    lower.includes('mobile');

  const wantsAddTable =
    lower.includes('table') ||
    lower.includes('tabel') ||
    lower.includes('list') ||
    lower.includes('daftar');

  const wantsAddSearch =
    lower.includes('search') ||
    lower.includes('pencarian') ||
    lower.includes('filter');

  const wantsSidebarUpdate = lower.includes('sidebar') || lower.includes('navigation');

  traverseTree(nodesToInspect, (node) => {
    let touched = false;

    if (wantsSidebarUpdate && node.name.toLowerCase().includes('sidebar')) {
      if (wantsCompact && typeof node.width === 'number') {
        node.width = Math.max(180, node.width - 44);
        touched = true;
        changesSummary.push(`Reduced "${node.name}" width to ${node.width}px for a minimal layout.`);
      }
      if (matchedColor) {
        node.style = { ...(node.style || {}), background: matchedColor.hex };
        touched = true;
        changesSummary.push(`Updated "${node.name}" background to ${matchedColor.label}.`);
      }
    }

    if (wantsCompact && node.layout) {
      if (typeof node.layout.gap === 'number' && node.layout.gap > 6) {
        node.layout.gap = Math.max(4, Math.round(node.layout.gap * 0.7));
        touched = true;
      }
      if (typeof node.layout.padding === 'number' && node.layout.padding > 8) {
        node.layout.padding = Math.max(8, Math.round(node.layout.padding * 0.75));
        touched = true;
      }
    }

    if (wantsSpacious && node.layout) {
      if (typeof node.layout.gap === 'number') {
        node.layout.gap = Math.min(48, Math.round((node.layout.gap || 12) * 1.35));
        touched = true;
      }
      if (typeof node.layout.padding === 'number' && node.layout.padding > 0) {
        node.layout.padding = Math.min(64, Math.round(node.layout.padding * 1.25));
        touched = true;
      }
    }

    if (wantsVerticalStack && node.layout?.mode === 'HORIZONTAL' && (node.children?.length || 0) >= 2) {
      node.layout.mode = 'VERTICAL';
      touched = true;
      changesSummary.push(`Converted "${node.name}" from HORIZONTAL to VERTICAL stack.`);
    }

    if (matchedColor && !wantsSidebarUpdate) {
      if (
        targetRoot?.id === node.id ||
        node.type === NODE_TYPES.COMPONENT_INSTANCE ||
        node.name.toLowerCase().includes('button') ||
        node.name.toLowerCase().includes('card') ||
        node.name.toLowerCase().includes('primary')
      ) {
        node.style = { ...(node.style || {}), background: matchedColor.hex };
        if (matchedColor.hex === '#0F172A' || matchedColor.hex === '#1E3A8A' || matchedColor.hex === '#2563EB') {
          if (node.type === NODE_TYPES.TEXT) {
            node.style.color = '#FFFFFF';
          }
        }
        touched = true;
      }
    }

    if (touched) {
      affectedNodes.push({ id: node.id, name: node.name, type: node.type });
    }
  });

  if (wantsAddSearch) {
    const searchBarNode = {
      id: generateNodeId('frame'),
      type: NODE_TYPES.FRAME,
      name: 'Search & Filter Bar',
      width: 'FILL',
      height: 'HUG',
      layout: {
        mode: 'HORIZONTAL',
        gap: 12,
        padding: { top: 10, right: 14, bottom: 10, left: 14 },
        alignment: 'SPACE_BETWEEN',
        crossAlignment: 'CENTER',
        widthMode: 'FILL',
        heightMode: 'HUG',
      },
      style: {
        background: '#FFFFFF',
        borderColor: '#CBD5E1',
        borderWidth: 1,
        borderRadius: 8,
      },
      children: [
        {
          id: generateNodeId('text'),
          type: NODE_TYPES.TEXT,
          name: 'Search Placeholder',
          text: 'Search records, services, or tags...',
          style: { color: '#64748B' },
          typography: { fontFamily: 'Inter', fontSize: 13, fontWeight: 400 },
        },
        {
          id: generateNodeId('text'),
          type: NODE_TYPES.TEXT,
          name: 'Shortcut Hint',
          text: 'Ctrl + K',
          style: { color: '#94A3B8' },
          typography: { fontFamily: 'Inter', fontSize: 11, fontWeight: 500 },
        },
      ],
    };

    const container =
      targetRoot && Array.isArray(targetRoot.children)
        ? targetRoot
        : findNodeById(next.document.children, 'frame_main_area') || next.document.children[0];
    if (container && Array.isArray(container.children)) {
      container.children.splice(Math.min(1, container.children.length), 0, searchBarNode);
      affectedNodes.push({ id: searchBarNode.id, name: searchBarNode.name, type: searchBarNode.type });
      changesSummary.push(`Inserted "Search & Filter Bar" inside "${container.name}".`);
    }
  }

  if (wantsAddTable) {
    const tableFrame = {
      id: generateNodeId('frame'),
      type: NODE_TYPES.FRAME,
      name: 'Structured Data Table',
      width: 'FILL',
      height: 'HUG',
      layout: {
        mode: 'VERTICAL',
        gap: 8,
        padding: 20,
        alignment: 'START',
        crossAlignment: 'STRETCH',
        widthMode: 'FILL',
        heightMode: 'HUG',
      },
      style: {
        background: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        borderRadius: 10,
      },
      children: [
        {
          id: generateNodeId('text'),
          type: NODE_TYPES.TEXT,
          name: 'Table Header Title',
          text: 'Data Records & Audit Log',
          style: { color: '#0F172A' },
          typography: { fontFamily: 'Inter', fontSize: 15, fontWeight: 600 },
        },
        ...[
          ['REC-1042', 'Production API Gateway', 'Healthy', '24ms'],
          ['REC-1043', 'Realtime Event Stream', 'Healthy', '19ms'],
          ['REC-1044', 'Identity Token Issuer', 'Verified', '11ms'],
        ].map(([idCode, service, status, latency], i) => ({
          id: generateNodeId('frame'),
          type: NODE_TYPES.FRAME,
          name: `Table Row ${i + 1}`,
          width: 'FILL',
          height: 'HUG',
          layout: {
            mode: 'HORIZONTAL',
            gap: 16,
            padding: { top: 10, right: 12, bottom: 10, left: 12 },
            alignment: 'SPACE_BETWEEN',
            crossAlignment: 'CENTER',
            widthMode: 'FILL',
            heightMode: 'HUG',
          },
          style: {
            background: i % 2 === 0 ? '#F8FAFC' : '#FFFFFF',
            borderRadius: 6,
          },
          children: [
            {
              id: generateNodeId('text'),
              type: NODE_TYPES.TEXT,
              name: 'Row ID & Service',
              text: `${idCode} — ${service}`,
              style: { color: '#0F172A' },
              typography: { fontFamily: 'Inter', fontSize: 13, fontWeight: 500 },
            },
            {
              id: generateNodeId('text'),
              type: NODE_TYPES.TEXT,
              name: 'Row Status & Latency',
              text: `${status} • ${latency}`,
              style: { color: '#21845A' },
              typography: { fontFamily: 'Inter', fontSize: 12, fontWeight: 600 },
            },
          ],
        })),
      ],
    };

    const container =
      targetRoot && Array.isArray(targetRoot.children)
        ? targetRoot
        : findNodeById(next.document.children, 'frame_main_area') || next.document.children[0];
    if (container && Array.isArray(container.children)) {
      container.children.push(tableFrame);
      affectedNodes.push({ id: tableFrame.id, name: tableFrame.name, type: tableFrame.type });
      changesSummary.push(`Added "Structured Data Table" with 3 data rows to "${container.name}".`);
    }
  }

  // Fallback if instruction was a custom text/heading update
  if (affectedNodes.length === 0) {
    const nodeToModify = targetRoot || next.document.children[0];
    if (nodeToModify) {
      if (nodeToModify.type === NODE_TYPES.TEXT) {
        nodeToModify.text = instruction;
        affectedNodes.push({ id: nodeToModify.id, name: nodeToModify.name, type: nodeToModify.type });
        changesSummary.push(`Updated text content of "${nodeToModify.name}".`);
      } else {
        const calloutNode = {
          id: generateNodeId('frame'),
          type: NODE_TYPES.FRAME,
          name: 'Revision Section',
          width: 'FILL',
          height: 'HUG',
          layout: {
            mode: 'VERTICAL',
            gap: 6,
            padding: 16,
            alignment: 'START',
            crossAlignment: 'START',
            widthMode: 'FILL',
            heightMode: 'HUG',
          },
          style: {
            background: '#FFFFFF',
            borderColor: '#5B63D3',
            borderWidth: 1,
            borderRadius: 8,
          },
          children: [
            {
              id: generateNodeId('text'),
              type: NODE_TYPES.TEXT,
              name: 'Revision Heading',
              text: instruction,
              style: { color: '#0F172A' },
              typography: { fontFamily: 'Inter', fontSize: 14, fontWeight: 600 },
            },
          ],
        };
        if (!Array.isArray(nodeToModify.children)) nodeToModify.children = [];
        nodeToModify.children.push(calloutNode);
        affectedNodes.push({ id: calloutNode.id, name: calloutNode.name, type: calloutNode.type });
        changesSummary.push(`Added new section "${instruction}" inside "${nodeToModify.name}".`);
      }
    }
  }

  if (changesSummary.length === 0) {
    changesSummary.push(`Updated ${affectedNodes.length} node(s) based on "${instruction}".`);
  }

  const validated = normalizeAndValidateSchema(next);
  return {
    updatedDocument: validated.document || next,
    affectedNodes,
    summary: changesSummary.join(' '),
  };
}
