import {
  LayoraDocumentSchema,
  NODE_TYPES,
  SCHEMA_VERSION,
  generateNodeId,
} from '../design-schema/schema.js';
import { migrateSchema } from '../design-schema/operations.js';

const MAX_TREE_DEPTH = 24;
const MAX_NODE_COUNT = 1500;
const CONTAINER_TYPES = new Set([
  NODE_TYPES.FRAME,
  NODE_TYPES.GROUP,
  NODE_TYPES.COMPONENT_INSTANCE,
]);

export function extractJsonFromText(rawInput) {
  if (!rawInput) throw new Error('Empty response received from AI provider.');
  if (typeof rawInput === 'object') return rawInput;

  const text = String(rawInput).trim();
  // Try direct JSON parse first
  try {
    return JSON.parse(text);
  } catch {
    // Strip markdown code fences if present
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {
        // Continue to brace extraction
      }
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }
    throw new Error('Could not parse valid JSON from response.');
  }
}

function normalizeNodeType(rawType) {
  const upper = String(rawType || 'FRAME').toUpperCase().trim();
  const aliasMap = {
    CONTAINER: NODE_TYPES.FRAME,
    SECTION: NODE_TYPES.FRAME,
    CARD: NODE_TYPES.FRAME,
    DIV: NODE_TYPES.FRAME,
    BOX: NODE_TYPES.FRAME,
    BUTTON: NODE_TYPES.FRAME,
    INPUT: NODE_TYPES.FRAME,
    HEADING: NODE_TYPES.TEXT,
    PARAGRAPH: NODE_TYPES.TEXT,
    LABEL: NODE_TYPES.TEXT,
    SPAN: NODE_TYPES.TEXT,
    RECT: NODE_TYPES.RECTANGLE,
    SHAPE: NODE_TYPES.RECTANGLE,
    CIRCLE: NODE_TYPES.ELLIPSE,
    AVATAR: NODE_TYPES.ELLIPSE,
    IMG: NODE_TYPES.IMAGE,
    PHOTO: NODE_TYPES.IMAGE,
    ICON: NODE_TYPES.VECTOR,
    SVG: NODE_TYPES.VECTOR,
    COMPONENT: NODE_TYPES.COMPONENT_INSTANCE,
  };
  if (NODE_TYPES[upper]) return NODE_TYPES[upper];
  return aliasMap[upper] || NODE_TYPES.FRAME;
}

function normalizeLayoutMode(mode) {
  const upper = String(mode || 'VERTICAL').toUpperCase().trim();
  if (upper === 'ROW' || upper === 'FLEX_ROW' || upper === 'HORIZONTAL') return 'HORIZONTAL';
  if (upper === 'COLUMN' || upper === 'FLEX_COL' || upper === 'VERTICAL') return 'VERTICAL';
  if (upper === 'NONE' || upper === 'ABSOLUTE' || upper === 'FREE') return 'NONE';
  return 'VERTICAL';
}

function normalizeAlignment(align) {
  const upper = String(align || 'START').toUpperCase().trim();
  if (upper === 'CENTER' || upper === 'MIDDLE') return 'CENTER';
  if (upper === 'END' || upper === 'RIGHT' || upper === 'BOTTOM' || upper === 'FLEX-END') return 'END';
  if (upper === 'SPACE_BETWEEN' || upper === 'SPACE-BETWEEN' || upper === 'BETWEEN') return 'SPACE_BETWEEN';
  return 'START';
}

function normalizeCrossAlignment(align) {
  const upper = String(align || 'STRETCH').toUpperCase().trim();
  if (upper === 'CENTER' || upper === 'MIDDLE') return 'CENTER';
  if (upper === 'END' || upper === 'RIGHT' || upper === 'BOTTOM') return 'END';
  if (upper === 'START' || upper === 'LEFT' || upper === 'TOP') return 'START';
  return 'STRETCH';
}

function normalizeDimension(val) {
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return Math.max(0, Math.round(val));
  }
  if (typeof val === 'string') {
    const upper = val.toUpperCase().trim();
    if (upper === 'FILL' || upper === '100%' || upper === 'FULL') return 'FILL';
    if (upper === 'HUG' || upper === 'AUTO' || upper === 'FIT') return 'HUG';
    const parsed = parseFloat(val);
    if (!Number.isNaN(parsed)) return Math.max(0, Math.round(parsed));
  }
  return undefined;
}

export function normalizeAndValidateSchema(rawInput) {
  const diagnostics = {
    valid: false,
    repairedCount: 0,
    warnings: [],
    errors: [],
    nodeCount: 0,
    maxDepthSeen: 0,
  };

  let parsed;
  try {
    parsed = extractJsonFromText(rawInput);
    parsed = migrateSchema(parsed);
  } catch (err) {
    diagnostics.errors.push(err.message);
    return { valid: false, document: null, diagnostics };
  }

  const seenIds = new Set();

  function normalizeNode(rawNode, depth = 1) {
    if (!rawNode || typeof rawNode !== 'object') return null;
    diagnostics.nodeCount += 1;
    diagnostics.maxDepthSeen = Math.max(diagnostics.maxDepthSeen, depth);

    if (diagnostics.nodeCount > MAX_NODE_COUNT) {
      diagnostics.warnings.push(`Maximum node count (${MAX_NODE_COUNT}) reached; truncating extra nodes.`);
      return null;
    }

    const type = normalizeNodeType(rawNode.type);
    if (type !== rawNode.type) {
      diagnostics.repairedCount += 1;
      diagnostics.warnings.push(`Normalized node type "${rawNode.type}" to "${type}".`);
    }

    let id = rawNode.id ? String(rawNode.id).trim() : generateNodeId(type);
    if (seenIds.has(id)) {
      const newId = generateNodeId(type);
      diagnostics.repairedCount += 1;
      diagnostics.warnings.push(`Duplicate node ID "${id}" renamed to "${newId}".`);
      id = newId;
    }
    seenIds.add(id);

    const name = String(rawNode.name || rawNode.label || type).trim() || type;
    const width = normalizeDimension(rawNode.width);
    const height = normalizeDimension(rawNode.height);

    const rawLayout = rawNode.layout || {};
    const layout = {
      mode: normalizeLayoutMode(rawLayout.mode || rawNode.layoutMode),
      gap: typeof rawLayout.gap === 'number' ? Math.max(0, rawLayout.gap) : 0,
      padding:
        typeof rawLayout.padding === 'number'
          ? Math.max(0, rawLayout.padding)
          : rawLayout.padding && typeof rawLayout.padding === 'object'
          ? {
              top: Math.max(0, Number(rawLayout.padding.top || 0)),
              right: Math.max(0, Number(rawLayout.padding.right || 0)),
              bottom: Math.max(0, Number(rawLayout.padding.bottom || 0)),
              left: Math.max(0, Number(rawLayout.padding.left || 0)),
            }
          : 0,
      alignment: normalizeAlignment(rawLayout.alignment),
      crossAlignment: normalizeCrossAlignment(rawLayout.crossAlignment),
      widthMode:
        width === 'FILL'
          ? 'FILL'
          : width === 'HUG'
          ? 'HUG'
          : rawLayout.widthMode || (typeof width === 'number' ? 'FIXED' : 'FILL'),
      heightMode:
        height === 'FILL'
          ? 'FILL'
          : height === 'HUG'
          ? 'HUG'
          : rawLayout.heightMode || (typeof height === 'number' ? 'FIXED' : 'HUG'),
      wrap: Boolean(rawLayout.wrap),
      clipContent: Boolean(rawLayout.clipContent),
    };

    const rawStyle = rawNode.style || {};
    const style = {
      background: rawStyle.background || rawStyle.fill || rawNode.background || undefined,
      fill: rawStyle.fill || rawStyle.background || undefined,
      color: rawStyle.color || rawNode.color || (type === NODE_TYPES.TEXT ? '#0F172A' : undefined),
      borderColor: rawStyle.borderColor || rawStyle.stroke || undefined,
      borderWidth:
        typeof rawStyle.borderWidth === 'number'
          ? Math.max(0, rawStyle.borderWidth)
          : typeof rawStyle.strokeWidth === 'number'
          ? Math.max(0, rawStyle.strokeWidth)
          : undefined,
      borderRadius:
        typeof rawStyle.borderRadius === 'number'
          ? Math.max(0, rawStyle.borderRadius)
          : typeof rawNode.borderRadius === 'number'
          ? Math.max(0, rawNode.borderRadius)
          : undefined,
      opacity:
        typeof rawStyle.opacity === 'number'
          ? Math.min(1, Math.max(0, rawStyle.opacity))
          : 1,
      boxShadow: rawStyle.boxShadow || undefined,
    };

    const normalized = {
      id,
      type,
      name,
      visible: rawNode.visible !== false,
      locked: Boolean(rawNode.locked),
      width,
      height,
      x: typeof rawNode.x === 'number' ? rawNode.x : undefined,
      y: typeof rawNode.y === 'number' ? rawNode.y : undefined,
      layout,
      style,
      tokenRefs: rawNode.tokenRefs && typeof rawNode.tokenRefs === 'object' ? rawNode.tokenRefs : undefined,
    };

    if (type === NODE_TYPES.TEXT) {
      normalized.text = String(rawNode.text ?? rawNode.content ?? rawNode.name ?? 'Text');
      const rawTypo = rawNode.typography || {};
      normalized.typography = {
        fontFamily: rawTypo.fontFamily || rawStyle.fontFamily || 'Inter',
        fontSize: Math.min(240, Math.max(6, Number(rawTypo.fontSize || rawStyle.fontSize || 14))),
        fontWeight: rawTypo.fontWeight || rawStyle.fontWeight || 400,
        lineHeight: rawTypo.lineHeight || rawStyle.lineHeight || 1.4,
        letterSpacing: Number(rawTypo.letterSpacing || 0),
        textAlign: ['LEFT', 'CENTER', 'RIGHT'].includes(String(rawTypo.textAlign || '').toUpperCase())
          ? String(rawTypo.textAlign).toUpperCase()
          : 'LEFT',
      };
    }

    if (type === NODE_TYPES.IMAGE || type === NODE_TYPES.VECTOR) {
      const rawAsset = rawNode.asset || {};
      normalized.asset = {
        src: rawAsset.src || rawNode.src || rawNode.url || undefined,
        fit: ['COVER', 'CONTAIN', 'FILL'].includes(String(rawAsset.fit || '').toUpperCase())
          ? String(rawAsset.fit).toUpperCase()
          : 'COVER',
        alt: rawAsset.alt || rawNode.name || 'Asset',
        iconName: rawAsset.iconName || rawNode.iconName || undefined,
        svgPath: rawAsset.svgPath || rawNode.svgPath || undefined,
      };
    }

    if (type === NODE_TYPES.COMPONENT_INSTANCE) {
      normalized.componentId = rawNode.componentId || 'comp_default';
    }

    if (CONTAINER_TYPES.has(type) && depth < MAX_TREE_DEPTH) {
      const rawChildren = Array.isArray(rawNode.children) ? rawNode.children : [];
      normalized.children = rawChildren
        .map((child) => normalizeNode(child, depth + 1))
        .filter(Boolean);
    } else if (Array.isArray(rawNode.children) && rawNode.children.length > 0) {
      diagnostics.repairedCount += 1;
      diagnostics.warnings.push(`Leaf node "${name}" (${type}) had children; stripped children.`);
    }

    return normalized;
  }

  const docBody = parsed.document || parsed;
  const rawChildren = Array.isArray(docBody.children) ? docBody.children : [];
  const normalizedChildren = rawChildren.map((n) => normalizeNode(n, 1)).filter(Boolean);

  const rawPages = Array.isArray(docBody.pages) ? docBody.pages : undefined;
  const normalizedPages = rawPages
    ? rawPages.map((p) => ({
        id: p.id || generateNodeId('page'),
        name: p.name || 'Page',
        viewport: {
          width: Math.min(7680, Math.max(200, Number(p.viewport?.width || 1440))),
          height: Math.min(7680, Math.max(200, Number(p.viewport?.height || 1024))),
        },
        background: p.background || '#FFFFFF',
        children: Array.isArray(p.children)
          ? p.children.map((n) => normalizeNode(n, 1)).filter(Boolean)
          : [],
      }))
    : undefined;

  const candidateDoc = {
    schemaVersion: SCHEMA_VERSION,
    document: {
      id: String(docBody.id || generateNodeId('doc')),
      name: String(docBody.name || 'Untitled Design'),
      viewport: {
        width: Math.min(7680, Math.max(200, Number(docBody.viewport?.width || 1440))),
        height: Math.min(7680, Math.max(200, Number(docBody.viewport?.height || 1024))),
      },
      background: docBody.background || '#F8FAFC',
      activePageId: docBody.activePageId || (normalizedPages?.[0]?.id ?? undefined),
      pages: normalizedPages,
      children: normalizedChildren,
    },
    metadata: parsed.metadata || {
      updatedAt: new Date().toISOString(),
    },
  };

  const result = LayoraDocumentSchema.safeParse(candidateDoc);
  if (!result.success) {
    result.error.issues.forEach((issue) => {
      diagnostics.errors.push(`${issue.path.join('.')}: ${issue.message}`);
    });
    return { valid: false, document: null, diagnostics };
  }

  diagnostics.valid = true;
  return {
    valid: true,
    document: result.data,
    diagnostics,
  };
}
