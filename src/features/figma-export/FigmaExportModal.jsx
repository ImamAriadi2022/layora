import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  FileCode,
  Layers,
} from 'lucide-react';
import {
  analyzeFigmaCompatibility,
  copyDesignToFigmaClipboard,
  extractNodeGeometry,
  generateFigmaSvg,
} from '../../core/exporters/figmaExporter.js';
import { serializeSchema } from '../../core/design-schema/operations.js';

export default function FigmaExportModal({
  schemaDoc,
  artboardRef,
  onClose,
}) {
  const [copyResult, setCopyResult] = useState(null);
  const [showSvgPreview, setShowSvgPreview] = useState(false);

  const compatibility = useMemo(
    () => analyzeFigmaCompatibility(schemaDoc),
    [schemaDoc]
  );

  const generatedSvg = useMemo(() => {
    const geom = extractNodeGeometry(schemaDoc, artboardRef?.current || null);
    return generateFigmaSvg(schemaDoc, geom);
  }, [schemaDoc, artboardRef]);

  const handleCopyNow = async () => {
    const res = await copyDesignToFigmaClipboard(
      schemaDoc,
      artboardRef?.current || null
    );
    setCopyResult(res);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([generatedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(schemaDoc?.document?.name || 'layora-design')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = serializeSchema(schemaDoc);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(schemaDoc?.document?.name || 'layora-design')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.layora.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-dialog border border-border bg-panel p-5 shadow-dialog space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            <div>
              <h2 className="text-panel-title text-text-primary">
                Copy to Figma — Compatibility & Clipboard Export
              </h2>
              <p className="text-meta text-text-secondary">
                Converts Layora Design Schema v{schemaDoc?.schemaVersion} into Figma-compatible clipboard layers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Figma Export Dialog"
            className="text-text-secondary hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Compatibility Metrics Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded border border-border bg-app p-3">
            <span className="text-meta text-text-muted block">Supported Layers</span>
            <span className="text-base font-semibold text-success">
              {compatibility.supportedCount} / {compatibility.totalNodes}
            </span>
          </div>
          <div className="rounded border border-border bg-app p-3">
            <span className="text-meta text-text-muted block">Text Editability</span>
            <span className="text-xs font-semibold text-text-primary mt-0.5 block">
              Native Editable &lt;text&gt;
            </span>
          </div>
          <div className="rounded border border-border bg-app p-3">
            <span className="text-meta text-text-muted block">Layout Mapping</span>
            <span className="text-xs font-semibold text-text-primary mt-0.5 block">
              Resolved Coordinates
            </span>
          </div>
        </div>

        {/* Node Breakdown */}
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(compatibility.countsByType).map(([type, count]) => (
            <span
              key={type}
              className="rounded border border-border bg-panel-muted px-2 py-0.5 text-meta font-mono text-text-primary"
            >
              {type}: {count}
            </span>
          ))}
        </div>

        {/* Preserved vs Approximated Disclosure (architecture.md Section 9.4) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded border border-border bg-app p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-text-primary">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span>Preserved in Figma Paste</span>
            </div>
            <ul className="space-y-1 text-meta text-text-secondary list-disc list-inside">
              {compatibility.preservedProperties.map((prop) => (
                <li key={prop}>{prop}</li>
              ))}
            </ul>
          </div>

          <div className="rounded border border-border bg-app p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-text-primary">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <span>Export Transparency & Approximations</span>
            </div>
            <p className="text-meta text-text-secondary leading-relaxed">
              {compatibility.layoutExplanation}
            </p>
            {compatibility.approximatedProperties.map((approx) => (
              <div key={approx.property} className="text-meta text-text-muted">
                • <strong>{approx.property}</strong> ({approx.affectedCount}): {approx.detail}
              </div>
            ))}
          </div>
        </div>

        {/* Optional Clipboard Payload Inspector */}
        <div>
          <button
            type="button"
            onClick={() => setShowSvgPreview(!showSvgPreview)}
            className="inline-flex items-center gap-1 text-meta text-accent hover:underline"
          >
            <FileCode className="h-3 w-3" />
            <span>
              {showSvgPreview
                ? 'Hide Clipboard Representation Payload'
                : 'Inspect Generated Figma Clipboard Payload'}
            </span>
          </button>

          {showSvgPreview && (
            <textarea
              readOnly
              rows={5}
              value={generatedSvg}
              className="mt-1.5 w-full rounded border border-border bg-panel-muted p-2 font-mono text-meta text-text-secondary"
            />
          )}
        </div>

        {/* Post-Copy Status Feedback */}
        {copyResult && (
          <div
            className={`rounded border p-3 ${
              copyResult.success
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-danger/40 bg-danger/10 text-danger'
            }`}
          >
            {copyResult.success ? (
              <div className="space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  <span>
                    Copied {compatibility.supportedCount} nodes to system clipboard ({copyResult.method})!
                  </span>
                </div>
                <p className="text-meta text-text-primary">
                  Next step: Open your Figma file and press <kbd className="rounded border border-border bg-panel px-1.5 py-0.5 font-mono">Ctrl + V</kbd> (or <kbd className="rounded border border-border bg-panel px-1.5 py-0.5 font-mono">Cmd + V</kbd>) to paste editable frames, shapes, and text layers.
                </p>
              </div>
            ) : (
              <div>
                <strong>Clipboard Write Error:</strong> {copyResult.error}. Use the SVG Fallback Download below or click Retry.
              </div>
            )}
          </div>
        )}

        {/* Footer Actions: Primary Clipboard Copy + Explicit Fallbacks */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="inline-flex items-center gap-1.5 rounded-control border border-border bg-app px-3 py-1.5 text-xs font-medium text-text-primary hover:border-accent"
            >
              <Download className="h-3.5 w-3.5 text-text-secondary" />
              <span>Fallback: Download .SVG</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 rounded-control border border-border bg-app px-3 py-1.5 text-xs font-medium text-text-primary hover:border-accent"
            >
              <Download className="h-3.5 w-3.5 text-text-secondary" />
              <span>Export Schema .JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-control border border-border bg-panel px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleCopyNow}
              className="inline-flex items-center gap-1.5 rounded-control bg-accent px-4 py-1.5 text-btn text-white hover:bg-accent-hover"
            >
              {copyResult?.success ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copyResult?.success ? 'Copied! Copy Again' : 'Copy to Figma Clipboard'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
