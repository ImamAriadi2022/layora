import React, { useState } from 'react';
import { NODE_TYPES } from '../design-schema/schema.js';
import { resolvePadding } from '../exporters/figmaExporter.js';

function resolveAlignment(align) {
  switch (String(align || 'START').toUpperCase()) {
    case 'CENTER':
      return 'center';
    case 'END':
      return 'flex-end';
    case 'SPACE_BETWEEN':
      return 'space-between';
    default:
      return 'flex-start';
  }
}

function resolveCrossAlignment(align) {
  switch (String(align || 'STRETCH').toUpperCase()) {
    case 'CENTER':
      return 'center';
    case 'END':
      return 'flex-end';
    case 'START':
      return 'flex-start';
    default:
      return 'stretch';
  }
}

export function resolveNodeTokens(node, designTokens = null) {
  if (!designTokens || !node?.tokenRefs) return node;
  const resolved = {
    ...node,
    style: { ...(node.style || {}) },
    typography: { ...(node.typography || {}) },
    layout: { ...(node.layout || {}) },
  };

  const tokenMap = {};
  (designTokens.colors || []).forEach((t) => {
    tokenMap[t.id] = t.value;
  });
  (designTokens.spacing || []).forEach((t) => {
    tokenMap[t.id] = t.value;
  });
  (designTokens.radii || []).forEach((t) => {
    tokenMap[t.id] = t.value;
  });
  (designTokens.typography || []).forEach((t) => {
    tokenMap[t.id] = t.value;
  });
  (designTokens.shadows || []).forEach((t) => {
    tokenMap[t.id] = t.value;
  });

  Object.entries(node.tokenRefs).forEach(([propPath, tokenId]) => {
    const val = tokenMap[tokenId];
    if (val === undefined) return;
    if (propPath === 'style.background') resolved.style.background = val;
    if (propPath === 'style.color') resolved.style.color = val;
    if (propPath === 'style.borderColor') resolved.style.borderColor = val;
    if (propPath === 'style.borderRadius') resolved.style.borderRadius = Number(val);
    if (propPath === 'style.boxShadow') resolved.style.boxShadow = val;
    if (propPath === 'layout.gap') resolved.layout.gap = Number(val);
    if (propPath === 'layout.padding') resolved.layout.padding = Number(val);
    if (propPath === 'typography.fontSize') resolved.typography.fontSize = Number(val);
  });

  return resolved;
}

function NodeElement({
  node,
  parentLayoutMode = 'VERTICAL',
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onHoverNode,
  onInlineTextChange,
  designTokens,
  interactive = true,
}) {
  const [editingText, setEditingText] = useState(false);

  if (!node || node.visible === false) return null;

  const effectiveNode = resolveNodeTokens(node, designTokens);
  const style = effectiveNode.style || {};
  const layout = effectiveNode.layout || {};
  const typo = effectiveNode.typography || {};
  const pad = resolvePadding(layout.padding);

  const isSelected = interactive && selectedNodeId === effectiveNode.id;
  const isHovered = interactive && hoveredNodeId === effectiveNode.id && !isSelected;

  const computeDimensionStyle = () => {
    const dim = {};
    const w = effectiveNode.width;
    const h = effectiveNode.height;
    const wMode = layout.widthMode || (w === 'FILL' ? 'FILL' : w === 'HUG' ? 'HUG' : typeof w === 'number' ? 'FIXED' : 'HUG');
    const hMode = layout.heightMode || (h === 'FILL' ? 'FILL' : h === 'HUG' ? 'HUG' : typeof h === 'number' ? 'FIXED' : 'HUG');

    if (typeof w === 'number') {
      dim.width = `${w}px`;
      dim.flexShrink = 0;
    } else if (w === 'FILL' || wMode === 'FILL') {
      if (parentLayoutMode === 'HORIZONTAL') {
        dim.flex = '1 1 0%';
        dim.minWidth = 0;
      } else {
        dim.width = '100%';
      }
    } else {
      dim.width = 'fit-content';
    }

    if (typeof h === 'number') {
      dim.height = `${h}px`;
      dim.flexShrink = 0;
    } else if (h === 'FILL' || hMode === 'FILL') {
      if (parentLayoutMode === 'VERTICAL') {
        dim.flex = '1 1 0%';
        dim.minHeight = 0;
      } else {
        dim.height = '100%';
      }
    } else {
      dim.height = 'fit-content';
    }

    if (parentLayoutMode === 'NONE') {
      dim.position = 'absolute';
      dim.left = `${Number(effectiveNode.x || 0)}px`;
      dim.top = `${Number(effectiveNode.y || 0)}px`;
    } else {
      dim.position = 'relative';
    }

    return dim;
  };

  const baseCss = {
    ...computeDimensionStyle(),
    backgroundColor: style.background || style.fill || undefined,
    color: style.color || undefined,
    borderColor: style.borderColor || style.stroke || undefined,
    borderStyle:
      (style.borderWidth || style.strokeWidth) && (style.borderColor || style.stroke)
        ? 'solid'
        : undefined,
    borderWidth:
      typeof style.borderWidth === 'number'
        ? `${style.borderWidth}px`
        : typeof style.strokeWidth === 'number'
        ? `${style.strokeWidth}px`
        : undefined,
    borderRadius:
      effectiveNode.type === NODE_TYPES.ELLIPSE
        ? '9999px'
        : typeof style.borderRadius === 'number'
        ? `${style.borderRadius}px`
        : undefined,
    opacity: typeof style.opacity === 'number' ? style.opacity : 1,
    boxShadow: style.boxShadow || undefined,
    cursor: interactive ? (effectiveNode.locked ? 'not-allowed' : 'pointer') : 'default',
    transition: 'box-shadow 80ms ease',
  };

  const handleClick = (e) => {
    if (!interactive) return;
    e.stopPropagation();
    if (onSelectNode) onSelectNode(effectiveNode.id);
  };

  const handleMouseEnter = (e) => {
    if (!interactive) return;
    e.stopPropagation();
    if (onHoverNode) onHoverNode(effectiveNode.id);
  };

  const handleMouseLeave = (e) => {
    if (!interactive) return;
    e.stopPropagation();
    if (onHoverNode && hoveredNodeId === effectiveNode.id) onHoverNode(null);
  };

  const commonProps = {
    'data-layora-node-id': effectiveNode.id,
    'data-layora-node-type': effectiveNode.type,
    'data-layora-node-name': effectiveNode.name,
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };

  if (effectiveNode.type === NODE_TYPES.TEXT) {
    const lineHeight = typo.lineHeight || 1.4;
    const textCss = {
      ...baseCss,
      fontFamily: `${typo.fontFamily || 'Inter'}, -apple-system, BlinkMacSystemFont, sans-serif`,
      fontSize: `${Number(typo.fontSize || 14)}px`,
      fontWeight: typo.fontWeight || 400,
      lineHeight: typeof lineHeight === 'number' && lineHeight > 4 ? `${lineHeight}px` : lineHeight,
      letterSpacing: typeof typo.letterSpacing === 'number' ? `${typo.letterSpacing}px` : undefined,
      textAlign: String(typo.textAlign || 'LEFT').toLowerCase(),
      color: style.color || '#0F172A',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      margin: 0,
    };

    if (editingText && interactive && !effectiveNode.locked) {
      return (
        <textarea
          {...commonProps}
          autoFocus
          defaultValue={effectiveNode.text ?? effectiveNode.content ?? ''}
          style={{
            ...textCss,
            minWidth: '80px',
            minHeight: '24px',
            outline: '2px solid #5B63D3',
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '4px',
            padding: '2px 4px',
            resize: 'none',
          }}
          onBlur={(e) => {
            setEditingText(false);
            if (onInlineTextChange) {
              onInlineTextChange(effectiveNode.id, e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
      );
    }

    return (
      <div
        {...commonProps}
        style={textCss}
        onDoubleClick={(e) => {
          if (!interactive || effectiveNode.locked) return;
          e.stopPropagation();
          setEditingText(true);
        }}
      >
        {effectiveNode.text ?? effectiveNode.content ?? ''}
      </div>
    );
  }

  if (effectiveNode.type === NODE_TYPES.RECTANGLE || effectiveNode.type === NODE_TYPES.ELLIPSE) {
    return <div {...commonProps} style={baseCss} />;
  }

  if (effectiveNode.type === NODE_TYPES.IMAGE) {
    const asset = effectiveNode.asset || {};
    const fitMap = {
      COVER: 'cover',
      CONTAIN: 'contain',
      FILL: 'fill',
    };
    return (
      <div
        {...commonProps}
        style={{
          ...baseCss,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: style.background || '#E2E8F0',
        }}
      >
        {asset.src ? (
          <img
            src={asset.src}
            alt={asset.alt || effectiveNode.name || 'Design image'}
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: fitMap[asset.fit] || 'cover',
              display: 'block',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <span style={{ fontSize: '11px', color: '#64748B' }}>Image Asset</span>
        )}
      </div>
    );
  }

  if (effectiveNode.type === NODE_TYPES.VECTOR) {
    const svgPath = effectiveNode.asset?.svgPath || 'M22 12h-4l-3 9L9 3l-3 9H2';
    const strokeColor = style.color || style.fill || '#475569';
    return (
      <div
        {...commonProps}
        style={{
          ...baseCss,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 24 24"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={svgPath} />
        </svg>
      </div>
    );
  }

  // Container nodes: FRAME, GROUP, COMPONENT_INSTANCE
  const mode = layout.mode || 'VERTICAL';
  const containerCss = {
    ...baseCss,
    display: mode === 'NONE' ? 'block' : 'flex',
    flexDirection: mode === 'HORIZONTAL' ? 'row' : 'column',
    gap: mode === 'NONE' ? undefined : `${Number(layout.gap || 0)}px`,
    paddingTop: `${pad.top}px`,
    paddingRight: `${pad.right}px`,
    paddingBottom: `${pad.bottom}px`,
    paddingLeft: `${pad.left}px`,
    justifyContent: mode === 'NONE' ? undefined : resolveAlignment(layout.alignment),
    alignItems: mode === 'NONE' ? undefined : resolveCrossAlignment(layout.crossAlignment),
    flexWrap: layout.wrap ? 'wrap' : 'nowrap',
    overflow: layout.clipContent ? 'hidden' : 'visible',
  };

  return (
    <div {...commonProps} style={containerCss}>
      {Array.isArray(effectiveNode.children) &&
        effectiveNode.children.map((child) => (
          <NodeElement
            key={child.id}
            node={child}
            parentLayoutMode={mode}
            selectedNodeId={selectedNodeId}
            hoveredNodeId={hoveredNodeId}
            onSelectNode={onSelectNode}
            onHoverNode={onHoverNode}
            onInlineTextChange={onInlineTextChange}
            designTokens={designTokens}
            interactive={interactive}
          />
        ))}
    </div>
  );
}

export default function DesignRenderer({
  schemaDoc,
  selectedNodeId = null,
  hoveredNodeId = null,
  onSelectNode = null,
  onHoverNode = null,
  onInlineTextChange = null,
  designTokens = null,
  interactive = true,
  artboardRef = null,
  zoom = 1,
}) {
  if (!schemaDoc || !schemaDoc.document) {
    return (
      <div className="p-8 text-center text-text-secondary">
        No valid Layora Design Schema document loaded.
      </div>
    );
  }

  const doc = schemaDoc.document;
  const viewport = doc.viewport || { width: 1440, height: 1024 };
  const children = doc.children || [];

  return (
    <div
      ref={artboardRef}
      data-layora-artboard="true"
      data-canvas-zoom={zoom}
      className="layora-artboard-isolation relative shadow-sm"
      style={{
        width: `${viewport.width}px`,
        minHeight: `${viewport.height}px`,
        backgroundColor: doc.background || '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={(e) => {
        if (!interactive) return;
        if (e.target === e.currentTarget && onSelectNode) {
          onSelectNode(null);
        }
      }}
    >
      {children.map((child) => (
        <NodeElement
          key={child.id}
          node={child}
          parentLayoutMode="VERTICAL"
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          onSelectNode={onSelectNode}
          onHoverNode={onHoverNode}
          onInlineTextChange={onInlineTextChange}
          designTokens={designTokens}
          interactive={interactive}
        />
      ))}
    </div>
  );
}
