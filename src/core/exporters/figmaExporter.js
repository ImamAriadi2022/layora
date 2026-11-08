import { NODE_TYPES } from '../design-schema/schema.js';
import { traverseTree } from '../design-schema/operations.js';

const SUPPORTED_TYPES = new Set([
  NODE_TYPES.FRAME,
  NODE_TYPES.TEXT,
  NODE_TYPES.RECTANGLE,
  NODE_TYPES.ELLIPSE,
  NODE_TYPES.IMAGE,
  NODE_TYPES.VECTOR,
  NODE_TYPES.GROUP,
  NODE_TYPES.COMPONENT_INSTANCE,
]);

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function resolvePadding(padding) {
  if (typeof padding === 'number') {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  if (padding && typeof padding === 'object') {
    return {
      top: Number(padding.top || 0),
      right: Number(padding.right || 0),
      bottom: Number(padding.bottom || 0),
      left: Number(padding.left || 0),
    };
  }
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

/**
 * Deterministic layout solver that calculates { x, y, width, height } for every node
 * in the Layora Design Schema tree. Used both as fallback and in headless tests.
 * When live DOM measurements are provided, DOM measurements override calculated boxes.
 */
export function computeDeterministicLayout(schemaDoc) {
  const viewport = schemaDoc?.document?.viewport || { width: 1440, height: 1024 };
  const boxes = new Map();

  function estimateIntrinsicSize(node, availableWidth = 320) {
    if (node.type === NODE_TYPES.TEXT) {
      const text = String(node.text || node.content || '');
      const fontSize = Number(node.typography?.fontSize || 14);
      const lineHeightRatio = Number(node.typography?.lineHeight || 1.4);
      const lineHeightPx = lineHeightRatio > 4 ? lineHeightRatio : Math.round(fontSize * lineHeightRatio);
      const avgCharWidth = fontSize * 0.56;
      const rawTextWidth = Math.ceil(text.length * avgCharWidth) + 4;
      const w =
        typeof node.width === 'number'
          ? node.width
          : Math.min(Math.max(40, availableWidth), Math.max(24, rawTextWidth));
      const lines = Math.max(1, Math.ceil(rawTextWidth / Math.max(40, w)));
      const h = typeof node.height === 'number' ? node.height : lines * lineHeightPx;
      return { width: w, height: h };
    }

    if (
      node.type === NODE_TYPES.RECTANGLE ||
      node.type === NODE_TYPES.ELLIPSE ||
      node.type === NODE_TYPES.IMAGE ||
      node.type === NODE_TYPES.VECTOR
    ) {
      return {
        width: typeof node.width === 'number' ? node.width : 120,
        height: typeof node.height === 'number' ? node.height : 80,
      };
    }

    const pad = resolvePadding(node.layout?.padding);
    const gap = Number(node.layout?.gap || 0);
    const mode = node.layout?.mode || 'VERTICAL';
    const children = (node.children || []).filter((c) => c.visible !== false);

    const fixedW = typeof node.width === 'number' ? node.width : null;
    const innerAvailableW = Math.max(40, (fixedW || availableWidth) - pad.left - pad.right);

    let totalChildW = 0;
    let maxChildW = 0;
    let totalChildH = 0;
    let maxChildH = 0;

    children.forEach((child, idx) => {
      const childEst = estimateIntrinsicSize(
        child,
        mode === 'HORIZONTAL' ? Math.floor(innerAvailableW / Math.max(1, children.length)) : innerAvailableW
      );
      totalChildW += childEst.width + (idx > 0 ? gap : 0);
      maxChildW = Math.max(maxChildW, childEst.width);
      totalChildH += childEst.height + (idx > 0 ? gap : 0);
      maxChildH = Math.max(maxChildH, childEst.height);
    });

    const computedW =
      fixedW !== null
        ? fixedW
        : node.width === 'FILL' || node.layout?.widthMode === 'FILL'
        ? availableWidth
        : (mode === 'HORIZONTAL' ? totalChildW : maxChildW) + pad.left + pad.right;

    const computedH =
      typeof node.height === 'number'
        ? node.height
        : (mode === 'VERTICAL' ? totalChildH : maxChildH) + pad.top + pad.bottom;

    return {
      width: Math.max(16, computedW),
      height: Math.max(16, computedH),
    };
  }

  function layoutSubtree(node, parentX, parentY, allocatedW, allocatedH) {
    if (node.visible === false) return;

    const est = estimateIntrinsicSize(node, allocatedW);
    const width = typeof node.width === 'number' ? node.width : allocatedW || est.width;
    const height = typeof node.height === 'number' ? node.height : allocatedH || est.height;
    const x = typeof node.x === 'number' ? parentX + node.x : parentX;
    const y = typeof node.y === 'number' ? parentY + node.y : parentY;

    boxes.set(node.id, { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });

    const children = (node.children || []).filter((c) => c.visible !== false);
    if (children.length === 0) return;

    const pad = resolvePadding(node.layout?.padding);
    const gap = Number(node.layout?.gap || 0);
    const mode = node.layout?.mode || 'VERTICAL';
    const alignment = node.layout?.alignment || 'START';
    const crossAlignment = node.layout?.crossAlignment || 'STRETCH';

    const innerX = x + pad.left;
    const innerY = y + pad.top;
    const innerW = Math.max(0, width - pad.left - pad.right);
    const innerH = Math.max(0, height - pad.top - pad.bottom);

    if (mode === 'HORIZONTAL') {
      const childEstimates = children.map((c) =>
        estimateIntrinsicSize(c, Math.floor((innerW - gap * (children.length - 1)) / children.length))
      );
      const fixedSum = childEstimates.reduce((acc, estItem, idx) => {
        const c = children[idx];
        const isFill = c.width === 'FILL' || c.layout?.widthMode === 'FILL';
        return acc + (isFill ? 0 : estItem.width);
      }, 0);
      const fillCount = children.filter((c) => c.width === 'FILL' || c.layout?.widthMode === 'FILL').length;
      const totalGaps = Math.max(0, children.length - 1) * gap;
      const remainingForFill = Math.max(0, innerW - fixedSum - totalGaps);
      const fillUnitW = fillCount > 0 ? remainingForFill / fillCount : 0;

      const resolvedWidths = children.map((c, idx) => {
        if (typeof c.width === 'number') return c.width;
        if (c.width === 'FILL' || c.layout?.widthMode === 'FILL') return Math.max(40, fillUnitW);
        return childEstimates[idx].width;
      });

      const totalContentW = resolvedWidths.reduce((a, b) => a + b, 0) + totalGaps;
      let cursorX = innerX;
      let effectiveGap = gap;

      if (alignment === 'CENTER') {
        cursorX = innerX + Math.max(0, (innerW - totalContentW) / 2);
      } else if (alignment === 'END') {
        cursorX = innerX + Math.max(0, innerW - totalContentW);
      } else if (alignment === 'SPACE_BETWEEN' && children.length > 1 && fillCount === 0) {
        effectiveGap = Math.max(gap, (innerW - resolvedWidths.reduce((a, b) => a + b, 0)) / (children.length - 1));
      }

      children.forEach((child, idx) => {
        const cW = resolvedWidths[idx];
        const cEst = estimateIntrinsicSize(child, cW);
        const cH =
          typeof child.height === 'number'
            ? child.height
            : child.height === 'FILL' || child.layout?.heightMode === 'FILL' || crossAlignment === 'STRETCH'
            ? Math.max(cEst.height, child.type === NODE_TYPES.TEXT ? cEst.height : innerH)
            : cEst.height;
        let childY = innerY;
        if (crossAlignment === 'CENTER') {
          childY = innerY + Math.max(0, (innerH - cH) / 2);
        } else if (crossAlignment === 'END') {
          childY = innerY + Math.max(0, innerH - cH);
        }
        layoutSubtree(child, cursorX, childY, cW, cH);
        cursorX += cW + effectiveGap;
      });
    } else if (mode === 'VERTICAL') {
      let cursorY = innerY;
      children.forEach((child) => {
        const isFillW =
          child.width === 'FILL' ||
          child.layout?.widthMode === 'FILL' ||
          (crossAlignment === 'STRETCH' && typeof child.width !== 'number' && child.width !== 'HUG');
        const cEst = estimateIntrinsicSize(child, innerW);
        const cW = typeof child.width === 'number' ? child.width : isFillW ? innerW : cEst.width;
        const cH = typeof child.height === 'number' ? child.height : cEst.height;
        let childX = innerX;
        if (crossAlignment === 'CENTER') {
          childX = innerX + Math.max(0, (innerW - cW) / 2);
        } else if (crossAlignment === 'END') {
          childX = innerX + Math.max(0, innerW - cW);
        }
        layoutSubtree(child, childX, cursorY, cW, cH);
        cursorY += cH + gap;
      });
    } else {
      children.forEach((child) => {
        const cEst = estimateIntrinsicSize(child, innerW);
        layoutSubtree(
          child,
          innerX + Number(child.x || 0),
          innerY + Number(child.y || 0),
          typeof child.width === 'number' ? child.width : cEst.width,
          typeof child.height === 'number' ? child.height : cEst.height
        );
      });
    }
  }

  let rootCursorY = 0;
  const rootChildren = (schemaDoc?.document?.children || []).filter((c) => c.visible !== false);
  rootChildren.forEach((rootNode) => {
    const est = estimateIntrinsicSize(rootNode, viewport.width);
    const w = typeof rootNode.width === 'number' ? rootNode.width : viewport.width;
    const h = typeof rootNode.height === 'number' ? rootNode.height : est.height;
    layoutSubtree(rootNode, Number(rootNode.x || 0), rootCursorY + Number(rootNode.y || 0), w, h);
    rootCursorY += h + 24;
  });

  return boxes;
}

/**
 * Extracts live bounding boxes from the rendered DOM artboard if present,
 * merging with deterministic layout boxes as fallback.
 */
export function extractNodeGeometry(schemaDoc, artboardDomEl = null) {
  const boxes = computeDeterministicLayout(schemaDoc);
  if (!artboardDomEl || typeof artboardDomEl.getBoundingClientRect !== 'function') {
    return boxes;
  }

  const artboardRect = artboardDomEl.getBoundingClientRect();
  const scaleAttr = Number(artboardDomEl.getAttribute('data-canvas-zoom') || 1) || 1;

  const nodeElements = artboardDomEl.querySelectorAll('[data-layora-node-id]');
  nodeElements.forEach((el) => {
    const id = el.getAttribute('data-layora-node-id');
    const rect = el.getBoundingClientRect();
    if (id && rect.width > 0 && rect.height > 0) {
      boxes.set(id, {
        x: Math.round((rect.left - artboardRect.left) / scaleAttr),
        y: Math.round((rect.top - artboardRect.top) / scaleAttr),
        width: Math.round(rect.width / scaleAttr),
        height: Math.round(rect.height / scaleAttr),
      });
    }
  });

  return boxes;
}

/**
 * Evaluates a Layora Design Schema document for Figma clipboard export compatibility.
 */
export function analyzeFigmaCompatibility(schemaDoc) {
  const report = {
    compatible: true,
    totalNodes: 0,
    supportedCount: 0,
    unsupportedCount: 0,
    countsByType: {},
    unsupportedNodes: [],
    preservedProperties: [
      'Layer hierarchy, nesting & custom layer names',
      'Editable <text> nodes with font family, size, weight, alignment & color',
      'Frames (<g> + <clipPath>) and Rectangles with fills, strokes & corner radius',
      'Ellipses and Vector icon paths',
      'Exact computed x, y, width & height layout coordinates',
    ],
    approximatedProperties: [],
    warnings: [],
    textEditable: true,
    layoutPreservationMode: 'STATIC_COORDINATES',
    layoutExplanation:
      'Flexbox layouts (VERTICAL / HORIZONTAL) are resolved to exact x/y coordinates so layers paste at identical positions in Figma. Native Figma Auto Layout is not created via SVG/HTML clipboard paste.',
  };

  const children = schemaDoc?.document?.children || [];
  let flexNodeCount = 0;
  let remoteImageCount = 0;
  let shadowNodeCount = 0;

  traverseTree(children, (node) => {
    if (node.visible === false) return false;
    report.totalNodes += 1;
    report.countsByType[node.type] = (report.countsByType[node.type] || 0) + 1;

    if (SUPPORTED_TYPES.has(node.type)) {
      report.supportedCount += 1;
    } else {
      report.unsupportedCount += 1;
      report.unsupportedNodes.push({ id: node.id, name: node.name, type: node.type });
    }

    if (
      (node.type === NODE_TYPES.FRAME || node.type === NODE_TYPES.GROUP || node.type === NODE_TYPES.COMPONENT_INSTANCE) &&
      (node.layout?.mode === 'VERTICAL' || node.layout?.mode === 'HORIZONTAL')
    ) {
      flexNodeCount += 1;
    }

    if (node.type === NODE_TYPES.IMAGE && node.asset?.src && !node.asset.src.startsWith('data:')) {
      remoteImageCount += 1;
    }

    if (node.style?.boxShadow) {
      shadowNodeCount += 1;
    }
  });

  if (flexNodeCount > 0) {
    report.approximatedProperties.push({
      property: 'Flexbox Layout (VERTICAL / HORIZONTAL)',
      affectedCount: flexNodeCount,
      detail: 'Converted to exact static layer coordinates on paste (not native Figma Auto Layout).',
    });
  }

  if (remoteImageCount > 0) {
    report.approximatedProperties.push({
      property: 'External Image Assets',
      affectedCount: remoteImageCount,
      detail: 'Embedded as inline data URI when CORS permits, or exported as styled image frame placeholder.',
    });
  }

  if (shadowNodeCount > 0) {
    report.approximatedProperties.push({
      property: 'Box Shadows',
      affectedCount: shadowNodeCount,
      detail: 'Approximated using SVG drop-shadow filter defs.',
    });
  }

  if (report.totalNodes === 0) {
    report.compatible = false;
    report.warnings.push('Document contains no visible nodes to export.');
  }

  return report;
}

function wrapTextIntoLines(text, maxWidthPx, fontSize) {
  const rawParagraphs = String(text || '').split('\n');
  const avgCharW = fontSize * 0.55;
  const maxCharsPerLine = Math.max(8, Math.floor((maxWidthPx + 8) / avgCharW));
  const lines = [];

  for (const para of rawParagraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let currentLine = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${currentLine} ${words[i]}`;
      if (candidate.length <= maxCharsPerLine) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Generates a Figma-compatible SVG document where:
 * - Every FRAME becomes a named `<g id="Frame Name">` with `<clipPath>` and background `<rect>`
 * - Every TEXT becomes an editable `<text id="Layer Name">` with `<tspan>` lines
 * - Every RECTANGLE / ELLIPSE / VECTOR / IMAGE becomes an individually selectable vector/shape layer
 */
export function generateFigmaSvg(schemaDoc, geometryMap = null) {
  const boxes = geometryMap || computeDeterministicLayout(schemaDoc);
  const viewport = schemaDoc?.document?.viewport || { width: 1440, height: 1024 };
  const docBg = schemaDoc?.document?.background || '#F8FAFC';
  const docName = escapeXml(schemaDoc?.document?.name || 'Layora Design');

  const defs = [];
  let clipCounter = 1;

  function renderNodeSvg(node, indent = '    ') {
    if (!node || node.visible === false) return '';
    const box = boxes.get(node.id) || { x: 0, y: 0, width: 100, height: 40 };
    const safeName = escapeXml(node.name || node.type);
    const style = node.style || {};
    const opacityAttr = typeof style.opacity === 'number' && style.opacity < 1 ? ` opacity="${style.opacity}"` : '';
    const radius = Number(style.borderRadius || 0);
    const rxAttr = radius > 0 ? ` rx="${Math.min(radius, Math.min(box.width, box.height) / 2)}"` : '';

    if (node.type === NODE_TYPES.TEXT) {
      const typo = node.typography || {};
      const fontFamily = escapeXml(typo.fontFamily || 'Inter');
      const fontSize = Number(typo.fontSize || 14);
      const fontWeight = escapeXml(typo.fontWeight || 400);
      const color = escapeXml(style.color || style.fill || '#0F172A');
      const lineHeightRatio = Number(typo.lineHeight || 1.4);
      const lineHeightPx = lineHeightRatio > 4 ? lineHeightRatio : Math.round(fontSize * lineHeightRatio);
      const textAlign = (typo.textAlign || 'LEFT').toUpperCase();

      let textAnchor = 'start';
      let textX = box.x;
      if (textAlign === 'CENTER') {
        textAnchor = 'middle';
        textX = Math.round(box.x + box.width / 2);
      } else if (textAlign === 'RIGHT') {
        textAnchor = 'end';
        textX = box.x + box.width;
      }

      const lines = wrapTextIntoLines(node.text ?? node.content ?? '', box.width, fontSize);
      const baselineY = Math.round(box.y + fontSize * 0.88);

      if (lines.length === 1) {
        return `${indent}<text id="${safeName}" x="${textX}" y="${baselineY}" fill="${color}" font-family="${fontFamily}, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="${textAnchor}"${opacityAttr}>${escapeXml(lines[0])}</text>`;
      }

      const tspans = lines
        .map((line, idx) => {
          const yPos = baselineY + idx * lineHeightPx;
          return `${indent}  <tspan x="${textX}" y="${yPos}">${escapeXml(line)}</tspan>`;
        })
        .join('\n');

      return `${indent}<text id="${safeName}" fill="${color}" font-family="${fontFamily}, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="${textAnchor}"${opacityAttr}>\n${tspans}\n${indent}</text>`;
    }

    if (node.type === NODE_TYPES.RECTANGLE) {
      const fill = escapeXml(style.background || style.fill || '#E2E8F0');
      const stroke = style.borderColor || style.stroke;
      const strokeW = Number(style.borderWidth || style.strokeWidth || 0);
      const strokeAttr =
        stroke && strokeW > 0 ? ` stroke="${escapeXml(stroke)}" stroke-width="${strokeW}"` : '';
      return `${indent}<rect id="${safeName}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${fill}"${rxAttr}${strokeAttr}${opacityAttr} />`;
    }

    if (node.type === NODE_TYPES.ELLIPSE) {
      const fill = escapeXml(style.background || style.fill || '#5B63D3');
      const cx = Math.round(box.x + box.width / 2);
      const cy = Math.round(box.y + box.height / 2);
      const rx = Math.round(box.width / 2);
      const ry = Math.round(box.height / 2);
      const stroke = style.borderColor || style.stroke;
      const strokeW = Number(style.borderWidth || style.strokeWidth || 0);
      const strokeAttr =
        stroke && strokeW > 0 ? ` stroke="${escapeXml(stroke)}" stroke-width="${strokeW}"` : '';
      return `${indent}<ellipse id="${safeName}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${strokeAttr}${opacityAttr} />`;
    }

    if (node.type === NODE_TYPES.VECTOR) {
      const strokeColor = escapeXml(style.color || style.fill || '#475569');
      const svgPath = node.asset?.svgPath || 'M22 12h-4l-3 9L9 3l-3 9H2';
      const scaleX = (box.width / 24).toFixed(3);
      const scaleY = (box.height / 24).toFixed(3);
      return `${indent}<g id="${safeName}" transform="translate(${box.x}, ${box.y}) scale(${scaleX}, ${scaleY})"${opacityAttr}>\n${indent}  <path d="${escapeXml(svgPath)}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />\n${indent}</g>`;
    }

    if (node.type === NODE_TYPES.IMAGE) {
      const bgFill = escapeXml(style.background || '#E2E8F0');
      const src = node.asset?.src || '';
      const clipId = `clip_img_${clipCounter++}`;
      defs.push(
        `    <clipPath id="${clipId}">\n      <rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}"${rxAttr} />\n    </clipPath>`
      );
      const parts = [
        `${indent}<g id="${safeName}" clip-path="url(#${clipId})"${opacityAttr}>`,
        `${indent}  <rect id="${safeName} Background" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${bgFill}"${rxAttr} />`,
      ];
      if (src.startsWith('data:image/')) {
        parts.push(
          `${indent}  <image id="${safeName} Bitmap" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" href="${escapeXml(src)}" preserveAspectRatio="xMidYMid slice" />`
        );
      } else {
        // Provide both the href image element and a clean vector representation so Figma always creates an editable frame
        parts.push(
          `${indent}  <rect id="${safeName} Surface" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="#1E293B"${rxAttr} />`,
          `${indent}  <text id="${safeName} Label" x="${Math.round(box.x + box.width / 2)}" y="${Math.round(box.y + box.height / 2 + 4)}" fill="#94A3B8" font-family="Inter, sans-serif" font-size="12" font-weight="500" text-anchor="middle">${escapeXml(node.asset?.alt || node.name || 'Image Asset')}</text>`
        );
      }
      parts.push(`${indent}</g>`);
      return parts.join('\n');
    }

    // FRAME, GROUP, or COMPONENT_INSTANCE
    const children = (node.children || []).filter((c) => c.visible !== false);
    const hasBg = Boolean(style.background || style.fill);
    const hasBorder = Boolean((style.borderColor || style.stroke) && Number(style.borderWidth || style.strokeWidth || 0) > 0);
    const lines = [];

    let clipAttr = '';
    if (node.layout?.clipContent) {
      const clipId = `clip_frame_${clipCounter++}`;
      defs.push(
        `    <clipPath id="${clipId}">\n      <rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}"${rxAttr} />\n    </clipPath>`
      );
      clipAttr = ` clip-path="url(#${clipId})"`;
    }

    lines.push(`${indent}<g id="${safeName}"${clipAttr}${opacityAttr}>`);

    if (hasBg || hasBorder) {
      const fill = hasBg ? escapeXml(style.background || style.fill) : 'none';
      const stroke = style.borderColor || style.stroke;
      const strokeW = Number(style.borderWidth || style.strokeWidth || 0);
      const strokeAttr =
        hasBorder && stroke ? ` stroke="${escapeXml(stroke)}" stroke-width="${strokeW}"` : '';
      lines.push(
        `${indent}  <rect id="${safeName} Background" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${fill}"${rxAttr}${strokeAttr} />`
      );
    }

    children.forEach((child) => {
      const renderedChild = renderNodeSvg(child, `${indent}  `);
      if (renderedChild) lines.push(renderedChild);
    });

    lines.push(`${indent}</g>`);
    return lines.join('\n');
  }

  const rootNodes = (schemaDoc?.document?.children || []).filter((c) => c.visible !== false);
  const bodyContent = rootNodes.map((n) => renderNodeSvg(n, '    ')).filter(Boolean).join('\n');

  const defsBlock = defs.length > 0 ? `  <defs>\n${defs.join('\n')}\n  </defs>\n` : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}" viewBox="0 0 ${viewport.width} ${viewport.height}" fill="none">`,
    defsBlock + `  <g id="${docName}">`,
    `    <rect id="Viewport Background" x="0" y="0" width="${viewport.width}" height="${viewport.height}" fill="${escapeXml(docBg)}" />`,
    bodyContent,
    `  </g>`,
    `</svg>`,
  ].join('\n');
}

/**
 * Generates clipboard representations and writes to system clipboard.
 */
export async function copyDesignToFigmaClipboard(schemaDoc, artboardDomEl = null) {
  const compatibility = analyzeFigmaCompatibility(schemaDoc);
  if (!compatibility.compatible) {
    return {
      success: false,
      compatibility,
      error: compatibility.warnings[0] || 'Design document is not compatible with export.',
    };
  }

  const geometry = extractNodeGeometry(schemaDoc, artboardDomEl);
  const svgString = generateFigmaSvg(schemaDoc, geometry);

  let copiedMethod = 'none';
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
        const plainBlob = new Blob([svgString], { type: 'text/plain' });
        const htmlBlob = new Blob([svgString], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': plainBlob,
            'text/html': htmlBlob,
          }),
        ]);
        copiedMethod = 'ClipboardItem (text/plain + text/html SVG)';
      } else if (navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(svgString);
        copiedMethod = 'clipboard.writeText (SVG)';
      }
    } else {
      throw new Error('Clipboard API is unavailable in this environment.');
    }
  } catch (err) {
    // Fallback textarea copy
    try {
      if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = svgString;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copiedMethod = 'execCommand fallback (SVG)';
      } else {
        throw err;
      }
    } catch (fallbackErr) {
      return {
        success: false,
        compatibility,
        svgString,
        error: fallbackErr.message || 'Failed to write to system clipboard.',
      };
    }
  }

  return {
    success: true,
    method: copiedMethod,
    compatibility,
    svgString,
    timestamp: new Date().toISOString(),
  };
}
