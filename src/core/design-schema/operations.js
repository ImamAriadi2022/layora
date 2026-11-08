import { generateNodeId, NODE_TYPES, SCHEMA_VERSION } from './schema.js';

export function cloneSchema(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function createDefaultNode(type = NODE_TYPES.FRAME, overrides = {}) {
  const id = overrides.id || generateNodeId(type);
  const defaultsByType = {
    [NODE_TYPES.FRAME]: {
      id,
      type: NODE_TYPES.FRAME,
      name: overrides.name || 'Frame',
      visible: true,
      locked: false,
      width: 320,
      height: 'HUG',
      layout: {
        mode: 'VERTICAL',
        gap: 12,
        padding: 16,
        alignment: 'START',
        crossAlignment: 'STRETCH',
        widthMode: 'FIXED',
        heightMode: 'HUG',
        clipContent: false,
      },
      style: {
        background: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        borderRadius: 8,
        opacity: 1,
      },
      children: [],
    },
    [NODE_TYPES.TEXT]: {
      id,
      type: NODE_TYPES.TEXT,
      name: overrides.name || 'Text Layer',
      visible: true,
      locked: false,
      text: overrides.text || 'Text content',
      width: 'HUG',
      height: 'HUG',
      style: {
        color: '#0F172A',
        opacity: 1,
      },
      typography: {
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1.4,
        letterSpacing: 0,
        textAlign: 'LEFT',
      },
    },
    [NODE_TYPES.RECTANGLE]: {
      id,
      type: NODE_TYPES.RECTANGLE,
      name: overrides.name || 'Rectangle',
      visible: true,
      locked: false,
      width: 160,
      height: 96,
      style: {
        background: '#E2E8F0',
        borderColor: '#CBD5E1',
        borderWidth: 0,
        borderRadius: 6,
        opacity: 1,
      },
    },
    [NODE_TYPES.ELLIPSE]: {
      id,
      type: NODE_TYPES.ELLIPSE,
      name: overrides.name || 'Ellipse',
      visible: true,
      locked: false,
      width: 48,
      height: 48,
      style: {
        background: '#5B63D3',
        borderRadius: 9999,
        opacity: 1,
      },
    },
    [NODE_TYPES.IMAGE]: {
      id,
      type: NODE_TYPES.IMAGE,
      name: overrides.name || 'Image',
      visible: true,
      locked: false,
      width: 280,
      height: 180,
      style: {
        borderRadius: 8,
        opacity: 1,
        background: '#F1F5F9',
      },
      asset: {
        src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
        fit: 'COVER',
        alt: 'Visual asset',
      },
    },
    [NODE_TYPES.VECTOR]: {
      id,
      type: NODE_TYPES.VECTOR,
      name: overrides.name || 'Vector Icon',
      visible: true,
      locked: false,
      width: 20,
      height: 20,
      style: {
        color: '#475569',
        opacity: 1,
      },
      asset: {
        iconName: 'Activity',
        svgPath: 'M22 12h-4l-3 9L9 3l-3 9H2',
      },
    },
    [NODE_TYPES.GROUP]: {
      id,
      type: NODE_TYPES.GROUP,
      name: overrides.name || 'Group',
      visible: true,
      locked: false,
      layout: {
        mode: 'HORIZONTAL',
        gap: 8,
        padding: 0,
        alignment: 'START',
        crossAlignment: 'CENTER',
      },
      style: {
        opacity: 1,
      },
      children: [],
    },
    [NODE_TYPES.COMPONENT_INSTANCE]: {
      id,
      type: NODE_TYPES.COMPONENT_INSTANCE,
      name: overrides.name || 'Component Instance',
      visible: true,
      locked: false,
      componentId: overrides.componentId || 'comp_button_primary',
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
        background: '#5B63D3',
        borderRadius: 6,
        opacity: 1,
      },
      children: [
        {
          id: generateNodeId('text'),
          type: NODE_TYPES.TEXT,
          name: 'Button Label',
          text: 'Action Button',
          style: { color: '#FFFFFF' },
          typography: { fontFamily: 'Inter', fontSize: 13, fontWeight: 500 },
        },
      ],
    },
  };

  const base = defaultsByType[type] || defaultsByType[NODE_TYPES.FRAME];
  return {
    ...base,
    ...overrides,
    layout: base.layout || overrides.layout ? { ...(base.layout || {}), ...(overrides.layout || {}) } : undefined,
    style: base.style || overrides.style ? { ...(base.style || {}), ...(overrides.style || {}) } : undefined,
    typography:
      base.typography || overrides.typography
        ? { ...(base.typography || {}), ...(overrides.typography || {}) }
        : undefined,
    asset: base.asset || overrides.asset ? { ...(base.asset || {}), ...(overrides.asset || {}) } : undefined,
  };
}

export function traverseTree(nodes, callback, parent = null, depth = 0) {
  if (!Array.isArray(nodes)) return;
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const shouldContinue = callback(node, parent, i, depth);
    if (shouldContinue === false) return;
    if (Array.isArray(node.children) && node.children.length > 0) {
      traverseTree(node.children, callback, node, depth + 1);
    }
  }
}

export function flattenNodes(schemaDoc) {
  const list = [];
  const children = schemaDoc?.document?.children || [];
  traverseTree(children, (node, parent, index, depth) => {
    list.push({ node, parentId: parent?.id || null, index, depth });
  });
  return list;
}

export function findNodeById(nodesOrDoc, nodeId) {
  if (!nodeId) return null;
  const nodes = Array.isArray(nodesOrDoc)
    ? nodesOrDoc
    : nodesOrDoc?.document?.children || [];
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (Array.isArray(node.children)) {
      const found = findNodeById(node.children, nodeId);
      if (found) return found;
    }
  }
  return null;
}

export function findParentNode(nodesOrDoc, nodeId, currentParent = null) {
  const nodes = Array.isArray(nodesOrDoc)
    ? nodesOrDoc
    : nodesOrDoc?.document?.children || [];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.id === nodeId) {
      return { parent: currentParent, list: nodes, index: i };
    }
    if (Array.isArray(node.children)) {
      const found = findParentNode(node.children, nodeId, node);
      if (found) return found;
    }
  }
  return null;
}

export function getNodePath(nodesOrDoc, nodeId) {
  const nodes = Array.isArray(nodesOrDoc)
    ? nodesOrDoc
    : nodesOrDoc?.document?.children || [];
  const path = [];

  function search(list) {
    for (const node of list) {
      path.push({ id: node.id, name: node.name, type: node.type });
      if (node.id === nodeId) return true;
      if (Array.isArray(node.children) && search(node.children)) {
        return true;
      }
      path.pop();
    }
    return false;
  }

  search(nodes);
  return path;
}

export function syncActivePage(docClone) {
  if (Array.isArray(docClone.document.pages) && docClone.document.pages.length > 0) {
    const activeId = docClone.document.activePageId || docClone.document.pages[0].id;
    const pageIndex = docClone.document.pages.findIndex((p) => p.id === activeId);
    if (pageIndex >= 0) {
      docClone.document.pages[pageIndex].children = docClone.document.children;
      docClone.document.pages[pageIndex].viewport = docClone.document.viewport;
      docClone.document.pages[pageIndex].background = docClone.document.background;
    }
  }
  return docClone;
}

export function updateNode(schemaDoc, nodeId, updater) {
  const next = cloneSchema(schemaDoc);
  const target = findNodeById(next.document.children, nodeId);
  if (!target) return next;

  const updates = typeof updater === 'function' ? updater(target) : updater;
  if (!updates) return syncActivePage(next);

  Object.keys(updates).forEach((key) => {
    if (
      (key === 'layout' || key === 'style' || key === 'typography' || key === 'asset' || key === 'tokenRefs') &&
      updates[key] &&
      typeof updates[key] === 'object'
    ) {
      target[key] = { ...(target[key] || {}), ...updates[key] };
    } else {
      target[key] = updates[key];
    }
  });

  return syncActivePage(next);
}

export function insertNode(schemaDoc, parentId, newNode, index = null) {
  const next = cloneSchema(schemaDoc);
  const nodeToInsert = newNode.id ? newNode : { ...newNode, id: generateNodeId(newNode.type || 'node') };

  if (!parentId || parentId === next.document.id || parentId === 'root') {
    if (index !== null && index >= 0 && index <= next.document.children.length) {
      next.document.children.splice(index, 0, nodeToInsert);
    } else {
      next.document.children.push(nodeToInsert);
    }
    return syncActivePage(next);
  }

  const parent = findNodeById(next.document.children, parentId);
  if (parent) {
    if (!Array.isArray(parent.children)) {
      if (parent.type === NODE_TYPES.FRAME || parent.type === NODE_TYPES.GROUP || parent.type === NODE_TYPES.COMPONENT_INSTANCE) {
        parent.children = [];
      } else {
        // Insert as sibling if target cannot contain children
        const parentInfo = findParentNode(next.document.children, parentId);
        if (parentInfo) {
          parentInfo.list.splice(parentInfo.index + 1, 0, nodeToInsert);
          return syncActivePage(next);
        }
      }
    }
    if (index !== null && index >= 0 && index <= parent.children.length) {
      parent.children.splice(index, 0, nodeToInsert);
    } else {
      parent.children.push(nodeToInsert);
    }
  } else {
    next.document.children.push(nodeToInsert);
  }

  return syncActivePage(next);
}

export function deleteNode(schemaDoc, nodeId) {
  const next = cloneSchema(schemaDoc);
  const info = findParentNode(next.document.children, nodeId);
  if (info) {
    info.list.splice(info.index, 1);
  }
  return syncActivePage(next);
}

function regenerateIdsRecursive(node, isRoot = true) {
  const copy = cloneSchema(node);
  copy.id = generateNodeId(copy.type);
  if (isRoot) {
    copy.name = `${copy.name} Copy`;
  }
  if (Array.isArray(copy.children)) {
    copy.children = copy.children.map((child) => regenerateIdsRecursive(child, false));
  }
  return copy;
}

export function duplicateNode(schemaDoc, nodeId) {
  const next = cloneSchema(schemaDoc);
  const info = findParentNode(next.document.children, nodeId);
  if (!info) return { doc: next, duplicatedId: null };

  const original = info.list[info.index];
  const duplicated = regenerateIdsRecursive(original, true);
  if (typeof duplicated.x === 'number') duplicated.x += 20;
  if (typeof duplicated.y === 'number') duplicated.y += 20;
  info.list.splice(info.index + 1, 0, duplicated);

  return { doc: syncActivePage(next), duplicatedId: duplicated.id };
}

export function reorderNode(schemaDoc, nodeId, directionOrIndex, targetParentId = undefined) {
  const next = cloneSchema(schemaDoc);
  const info = findParentNode(next.document.children, nodeId);
  if (!info) return next;

  const [node] = info.list.splice(info.index, 1);

  if (targetParentId !== undefined && targetParentId !== (info.parent?.id || null)) {
    return insertNode(next, targetParentId, node, typeof directionOrIndex === 'number' ? directionOrIndex : null);
  }

  let newIndex = info.index;
  if (directionOrIndex === 'UP') {
    newIndex = Math.max(0, info.index - 1);
  } else if (directionOrIndex === 'DOWN') {
    newIndex = Math.min(info.list.length, info.index + 1);
  } else if (directionOrIndex === 'FIRST') {
    newIndex = 0;
  } else if (directionOrIndex === 'LAST') {
    newIndex = info.list.length;
  } else if (typeof directionOrIndex === 'number') {
    newIndex = Math.max(0, Math.min(info.list.length, directionOrIndex));
  }

  info.list.splice(newIndex, 0, node);
  return syncActivePage(next);
}

export function groupNodeInFrame(schemaDoc, nodeId) {
  const next = cloneSchema(schemaDoc);
  const info = findParentNode(next.document.children, nodeId);
  if (!info) return { doc: next, groupId: null };

  const targetNode = info.list[info.index];
  const groupNode = createDefaultNode(NODE_TYPES.GROUP, {
    name: `${targetNode.name} Group`,
    children: [targetNode],
  });
  info.list.splice(info.index, 1, groupNode);
  return { doc: syncActivePage(next), groupId: groupNode.id };
}

export function ungroupNode(schemaDoc, nodeId) {
  const next = cloneSchema(schemaDoc);
  const info = findParentNode(next.document.children, nodeId);
  if (!info) return next;

  const targetNode = info.list[info.index];
  if (Array.isArray(targetNode.children) && targetNode.children.length > 0) {
    info.list.splice(info.index, 1, ...targetNode.children);
  }
  return syncActivePage(next);
}

export function switchDocumentPage(schemaDoc, pageId) {
  const next = cloneSchema(schemaDoc);
  syncActivePage(next);
  const pages = next.document.pages || [];
  const targetPage = pages.find((p) => p.id === pageId);
  if (!targetPage) return next;

  next.document.activePageId = targetPage.id;
  next.document.children = cloneSchema(targetPage.children || []);
  next.document.viewport = cloneSchema(targetPage.viewport || { width: 1440, height: 1024 });
  next.document.background = targetPage.background || '#FFFFFF';
  return next;
}

export function addDocumentPage(schemaDoc, pageName = 'New Page', viewport = null) {
  const next = cloneSchema(schemaDoc);
  if (!Array.isArray(next.document.pages) || next.document.pages.length === 0) {
    const firstPageId = generateNodeId('page');
    next.document.pages = [
      {
        id: firstPageId,
        name: next.document.name || 'Page 1',
        viewport: cloneSchema(next.document.viewport || { width: 1440, height: 1024 }),
        background: next.document.background || '#FFFFFF',
        children: cloneSchema(next.document.children || []),
      },
    ];
    next.document.activePageId = firstPageId;
  } else {
    syncActivePage(next);
  }

  const newPageId = generateNodeId('page');
  const newViewport = viewport || cloneSchema(next.document.viewport || { width: 1440, height: 1024 });
  const newPage = {
    id: newPageId,
    name: pageName,
    viewport: newViewport,
    background: '#F8FAFC',
    children: [
      createDefaultNode(NODE_TYPES.FRAME, {
        name: `${pageName} Container`,
        width: newViewport.width - 96,
        layout: {
          mode: 'VERTICAL',
          gap: 16,
          padding: 32,
          alignment: 'START',
          crossAlignment: 'STRETCH',
          widthMode: 'FILL',
          heightMode: 'HUG',
        },
        style: {
          background: '#FFFFFF',
          borderColor: '#E2E8F0',
          borderWidth: 1,
          borderRadius: 12,
        },
        children: [
          createDefaultNode(NODE_TYPES.TEXT, {
            name: 'Page Heading',
            text: pageName,
            style: { color: '#0F172A' },
            typography: { fontFamily: 'Inter', fontSize: 24, fontWeight: 600 },
          }),
          createDefaultNode(NODE_TYPES.TEXT, {
            name: 'Page Subtitle',
            text: 'Use the visual editor or AI Chat to build out this screen.',
            style: { color: '#64748B' },
            typography: { fontFamily: 'Inter', fontSize: 14, fontWeight: 400 },
          }),
        ],
      }),
    ],
  };

  next.document.pages.push(newPage);
  next.document.activePageId = newPageId;
  next.document.children = cloneSchema(newPage.children);
  next.document.viewport = cloneSchema(newPage.viewport);
  next.document.background = newPage.background;
  return next;
}

export function serializeSchema(schemaDoc) {
  return JSON.stringify(schemaDoc, null, 2);
}

export function migrateSchema(rawDoc) {
  if (!rawDoc || typeof rawDoc !== 'object') {
    throw new Error('Cannot migrate empty or non-object document');
  }
  const copy = cloneSchema(rawDoc);

  // Migrate v0.x or unwrapped documents into v1.0.0 envelope
  if (!copy.document && copy.id && Array.isArray(copy.children)) {
    return {
      schemaVersion: SCHEMA_VERSION,
      document: {
        id: copy.id,
        name: copy.name || 'Untitled Design',
        viewport: copy.viewport || { width: 1440, height: 1024 },
        background: copy.background || '#FFFFFF',
        children: copy.children,
      },
    };
  }

  if (!copy.schemaVersion || copy.schemaVersion !== SCHEMA_VERSION) {
    copy.schemaVersion = SCHEMA_VERSION;
  }

  if (copy.document && !copy.document.viewport) {
    copy.document.viewport = { width: 1440, height: 1024 };
  }

  return copy;
}
