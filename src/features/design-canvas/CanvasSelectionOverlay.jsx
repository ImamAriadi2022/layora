import React, { useEffect, useState, useCallback } from 'react';

const HANDLE_SIZE = 7;

export default function CanvasSelectionOverlay({
  artboardRef,
  selectedNodeId,
  hoveredNodeId,
  zoom = 1,
  activeDocument,
  onResizeNode,
}) {
  const [selectedRect, setSelectedRect] = useState(null);
  const [hoveredRect, setHoveredRect] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [alignmentGuides, setAlignmentGuides] = useState([]);

  const measureRects = useCallback(() => {
    const artboardEl = artboardRef?.current;
    if (!artboardEl) return;
    const artboardBox = artboardEl.getBoundingClientRect();

    if (selectedNodeId) {
      const selEl = artboardEl.querySelector(`[data-layora-node-id="${selectedNodeId}"]`);
      if (selEl) {
        const r = selEl.getBoundingClientRect();
        setSelectedRect({
          x: Math.round((r.left - artboardBox.left) / zoom),
          y: Math.round((r.top - artboardBox.top) / zoom),
          width: Math.round(r.width / zoom),
          height: Math.round(r.height / zoom),
          name: selEl.getAttribute('data-layora-node-name') || 'Layer',
          type: selEl.getAttribute('data-layora-node-type') || 'FRAME',
        });
      } else {
        setSelectedRect(null);
      }
    } else {
      setSelectedRect(null);
    }

    if (hoveredNodeId && hoveredNodeId !== selectedNodeId) {
      const hovEl = artboardEl.querySelector(`[data-layora-node-id="${hoveredNodeId}"]`);
      if (hovEl) {
        const r = hovEl.getBoundingClientRect();
        setHoveredRect({
          x: Math.round((r.left - artboardBox.left) / zoom),
          y: Math.round((r.top - artboardBox.top) / zoom),
          width: Math.round(r.width / zoom),
          height: Math.round(r.height / zoom),
          name: hovEl.getAttribute('data-layora-node-name') || 'Layer',
        });
      } else {
        setHoveredRect(null);
      }
    } else {
      setHoveredRect(null);
    }
  }, [artboardRef, selectedNodeId, hoveredNodeId, zoom]);

  useEffect(() => {
    measureRects();
    const timer = setTimeout(measureRects, 40);
    window.addEventListener('resize', measureRects);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measureRects);
    };
  }, [measureRects, activeDocument]);

  useEffect(() => {
    if (!dragState) return undefined;

    const handleMouseMove = (e) => {
      const dx = Math.round((e.clientX - dragState.startClientX) / zoom);
      const dy = Math.round((e.clientY - dragState.startClientY) / zoom);

      let nextW = dragState.startWidth;
      let nextH = dragState.startHeight;

      if (dragState.handle.includes('e')) nextW = Math.max(20, dragState.startWidth + dx);
      if (dragState.handle.includes('w')) nextW = Math.max(20, dragState.startWidth - dx);
      if (dragState.handle.includes('s')) nextH = Math.max(16, dragState.startHeight + dy);
      if (dragState.handle.includes('n')) nextH = Math.max(16, dragState.startHeight - dy);

      // Compute alignment guides against artboard center
      const viewport = activeDocument?.document?.viewport || { width: 1440, height: 1024 };
      const guides = [];
      const currentCenterX = dragState.startX + nextW / 2;
      if (Math.abs(currentCenterX - viewport.width / 2) < 6) {
        guides.push({ type: 'vertical', pos: viewport.width / 2 });
      }
      setAlignmentGuides(guides);

      setSelectedRect((prev) =>
        prev ? { ...prev, width: nextW, height: nextH } : null
      );
    };

    const handleMouseUp = (e) => {
      const dx = Math.round((e.clientX - dragState.startClientX) / zoom);
      const dy = Math.round((e.clientY - dragState.startClientY) / zoom);

      let finalW = dragState.startWidth;
      let finalH = dragState.startHeight;
      if (dragState.handle.includes('e')) finalW = Math.max(20, dragState.startWidth + dx);
      if (dragState.handle.includes('w')) finalW = Math.max(20, dragState.startWidth - dx);
      if (dragState.handle.includes('s')) finalH = Math.max(16, dragState.startHeight + dy);
      if (dragState.handle.includes('n')) finalH = Math.max(16, dragState.startHeight - dy);

      setDragState(null);
      setAlignmentGuides([]);

      if (onResizeNode && (finalW !== dragState.startWidth || finalH !== dragState.startHeight)) {
        const updates = { layout: {} };
        if (dragState.handle.includes('e') || dragState.handle.includes('w')) {
          updates.width = finalW;
          updates.layout.widthMode = 'FIXED';
        }
        if (dragState.handle.includes('s') || dragState.handle.includes('n')) {
          updates.height = finalH;
          updates.layout.heightMode = 'FIXED';
        }
        onResizeNode(selectedNodeId, updates);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, zoom, activeDocument, onResizeNode, selectedNodeId]);

  const viewport = activeDocument?.document?.viewport || { width: 1440, height: 1024 };

  const startResize = (e, handle) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedRect) return;
    setDragState({
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: selectedRect.x,
      startY: selectedRect.y,
      startWidth: selectedRect.width,
      startHeight: selectedRect.height,
    });
  };

  return (
    <svg
      data-layora-selection-overlay="true"
      width={viewport.width}
      height={viewport.height}
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
    >
      {/* Alignment Guides */}
      {alignmentGuides.map((g, idx) =>
        g.type === 'vertical' ? (
          <line
            key={idx}
            x1={g.pos}
            y1={0}
            x2={g.pos}
            y2={viewport.height}
            stroke="#EC4899"
            strokeWidth={1 / zoom}
            strokeDasharray="4 4"
          />
        ) : null
      )}

      {/* Hovered Node Outline */}
      {hoveredRect && (
        <g>
          <rect
            x={hoveredRect.x}
            y={hoveredRect.y}
            width={hoveredRect.width}
            height={hoveredRect.height}
            fill="none"
            stroke="#5B63D3"
            strokeWidth={1 / zoom}
            strokeDasharray="3 2"
          />
        </g>
      )}

      {/* Selected Node Outline, Handles & Dimension Pill */}
      {selectedRect && (
        <g>
          <rect
            x={selectedRect.x}
            y={selectedRect.y}
            width={selectedRect.width}
            height={selectedRect.height}
            fill="rgba(91, 99, 211, 0.03)"
            stroke="#5B63D3"
            strokeWidth={1.5 / zoom}
          />

          {/* Top-Left Layer Name Label */}
          <g transform={`translate(${selectedRect.x}, ${Math.max(0, selectedRect.y - 20)})`}>
            <rect
              x={0}
              y={0}
              width={Math.min(220, selectedRect.name.length * 6.5 + 16)}
              height={18}
              rx={3}
              fill="#5B63D3"
            />
            <text
              x={6}
              y={12.5}
              fill="#FFFFFF"
              fontSize="10"
              fontFamily="Inter, sans-serif"
              fontWeight="500"
            >
              {selectedRect.name.slice(0, 30)}
            </text>
          </g>

          {/* Bottom-Center Dimensions Badge */}
          <g
            transform={`translate(${
              selectedRect.x + selectedRect.width / 2 - 36
            }, ${selectedRect.y + selectedRect.height + 6})`}
          >
            <rect x={0} y={0} width={72} height={18} rx={3} fill="#20242B" />
            <text
              x={36}
              y={12.5}
              fill="#FFFFFF"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="500"
              textAnchor="middle"
            >
              {selectedRect.width} × {selectedRect.height}
            </text>
          </g>

          {/* 8 Interactive Resize Handles */}
          {[
            { id: 'nw', cx: selectedRect.x, cy: selectedRect.y, cursor: 'nwse-resize' },
            { id: 'n', cx: selectedRect.x + selectedRect.width / 2, cy: selectedRect.y, cursor: 'ns-resize' },
            { id: 'ne', cx: selectedRect.x + selectedRect.width, cy: selectedRect.y, cursor: 'nesw-resize' },
            { id: 'e', cx: selectedRect.x + selectedRect.width, cy: selectedRect.y + selectedRect.height / 2, cursor: 'ew-resize' },
            { id: 'se', cx: selectedRect.x + selectedRect.width, cy: selectedRect.y + selectedRect.height, cursor: 'nwse-resize' },
            { id: 's', cx: selectedRect.x + selectedRect.width / 2, cy: selectedRect.y + selectedRect.height, cursor: 'ns-resize' },
            { id: 'sw', cx: selectedRect.x, cy: selectedRect.y + selectedRect.height, cursor: 'nesw-resize' },
            { id: 'w', cx: selectedRect.x, cy: selectedRect.y + selectedRect.height / 2, cursor: 'ew-resize' },
          ].map((h) => (
            <rect
              key={h.id}
              x={h.cx - HANDLE_SIZE / 2}
              y={h.cy - HANDLE_SIZE / 2}
              width={HANDLE_SIZE}
              height={HANDLE_SIZE}
              rx={1.5}
              fill="#FFFFFF"
              stroke="#5B63D3"
              strokeWidth={1.5}
              style={{ pointerEvents: 'all', cursor: h.cursor }}
              onMouseDown={(e) => startResize(e, h.id)}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
