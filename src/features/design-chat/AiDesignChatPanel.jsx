import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Check,
  X,
  Target,
  Layers,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { useAgentStore } from '../../stores/useAgentStore.js';
import { useReferenceStore } from '../../stores/useReferenceStore.js';
import { executeAgentRevision } from '../../services/agent-adapters/agentRegistry.js';

const QUICK_REVISIONS = [
  'Make the sidebar narrower and more minimal',
  'Add a structured data table below the metrics',
  'Change primary accent to dark blue',
  'Make card spacing and padding more compact',
  'Add a search and filter bar at the top',
];

export default function AiDesignChatPanel() {
  const {
    activeProjectId,
    activeDocument,
    selectedNodeId,
    getSelectedNode,
    chatMessages,
    appendChatMessage,
    pendingRevision,
    stageRevisionForReview,
    acceptPendingRevision,
    discardPendingRevision,
  } = useProjectStore();

  const { getActiveAgent } = useAgentStore();
  const { references } = useReferenceStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [scope, setScope] = useState('auto'); // 'auto' | 'page' | 'selected'
  const [isRevising, setIsRevising] = useState(false);

  const selectedNode = getSelectedNode();
  const activeAgent = getActiveAgent();
  const messages = chatMessages[activeProjectId] || [];
  const attachedRefs = references.filter((r) => r.attachedToTask);

  const effectiveScope =
    scope === 'selected' && selectedNode
      ? 'selected'
      : scope === 'auto' && selectedNode
      ? 'selected'
      : 'page';

  const handleSendInstruction = async (customText = null) => {
    const instruction = (customText ?? inputPrompt).trim();
    if (!instruction || !activeDocument || isRevising) return;

    if (!customText) setInputPrompt('');

    appendChatMessage(activeProjectId, {
      role: 'user',
      content: instruction,
      scopeLabel:
        effectiveScope === 'selected' && selectedNode
          ? `Node: ${selectedNode.name}`
          : 'Whole Page',
    });

    setIsRevising(true);
    try {
      const result = await executeAgentRevision({
        agentConfig: activeAgent,
        schemaDoc: activeDocument,
        instruction,
        selectedNodeId: effectiveScope === 'selected' ? selectedNodeId : null,
        scope: effectiveScope,
      });

      appendChatMessage(activeProjectId, {
        role: 'assistant',
        content: result.summary,
        affectedNodes: result.affectedNodes,
      });

      stageRevisionForReview({
        instruction,
        summary: result.summary,
        affectedNodes: result.affectedNodes,
        updatedDocument: result.updatedDocument,
      });
    } catch (err) {
      appendChatMessage(activeProjectId, {
        role: 'system',
        content: `Revision failed: ${err.message}`,
      });
    } finally {
      setIsRevising(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between text-xs">
      {/* Top Context & Scope Header */}
      <div className="border-b border-border p-3 space-y-2 bg-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="font-semibold text-text-primary">AI Design Assistant</span>
          </div>
          <span className="text-meta text-text-muted truncate max-w-[130px]">
            {activeAgent?.name}
          </span>
        </div>

        {/* Scope Selector Pill */}
        <div className="flex items-center justify-between rounded border border-border bg-app px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {effectiveScope === 'selected' && selectedNode ? (
              <>
                <Target className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-meta text-text-primary truncate">
                  Target: <strong>{selectedNode.name}</strong>
                </span>
              </>
            ) : (
              <>
                <Layers className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                <span className="text-meta text-text-secondary">
                  Scope: <strong>Whole Page</strong>
                </span>
              </>
            )}
          </div>

          {selectedNode && (
            <button
              type="button"
              onClick={() => setScope(effectiveScope === 'selected' ? 'page' : 'selected')}
              className="text-meta text-accent hover:underline shrink-0 ml-2"
            >
              Switch to {effectiveScope === 'selected' ? 'Page' : 'Node'}
            </button>
          )}
        </div>
      </div>

      {/* Pending Revision Review Banner (Section 10 & design.md Section 7) */}
      {pendingRevision && (
        <div className="border-b border-accent bg-accent-subtle p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-accent text-xs">
              Review Proposed Schema Revision
            </span>
            <span className="rounded bg-accent px-1.5 py-0.5 text-meta text-white">
              {pendingRevision.affectedNodes?.length || 1} node(s)
            </span>
          </div>

          <p className="text-meta text-text-primary leading-relaxed">
            {pendingRevision.summary}
          </p>

          {pendingRevision.affectedNodes?.length > 0 && (
            <div className="max-h-20 overflow-y-auto rounded border border-border bg-panel p-1.5 space-y-1">
              {pendingRevision.affectedNodes.slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-center justify-between text-meta">
                  <span className="font-medium text-text-primary truncate">{n.name}</span>
                  <span className="font-mono text-text-muted">{n.type}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={acceptPendingRevision}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-accent py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply Changes</span>
            </button>
            <button
              type="button"
              onClick={discardPendingRevision}
              className="inline-flex items-center justify-center gap-1 rounded border border-border bg-panel px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-danger"
            >
              <X className="h-3.5 w-3.5" />
              <span>Discard</span>
            </button>
          </div>
        </div>
      )}

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-3 py-2">
            <p className="text-secondary text-text-secondary leading-relaxed">
              Ask the AI to refine layouts, adjust spacing, change color tokens, or insert new components. Unrelated manual edits are preserved.
            </p>
            <div className="space-y-1.5">
              <span className="text-meta font-medium text-text-muted block">
                Suggested Revisions:
              </span>
              {QUICK_REVISIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSendInstruction(suggestion)}
                  className="block w-full rounded border border-border bg-app px-2.5 py-1.5 text-left text-meta text-text-primary hover:border-accent transition-colors"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-control p-2.5 space-y-1 ${
                msg.role === 'user'
                  ? 'bg-accent text-white ml-4'
                  : msg.role === 'system'
                  ? 'border border-border bg-panel-muted text-text-secondary text-meta'
                  : 'border border-border bg-app text-text-primary mr-4'
              }`}
            >
              <div className="flex items-center justify-between text-meta opacity-80">
                <span className="font-semibold uppercase">
                  {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'Layora AI'}
                </span>
                {msg.scopeLabel && <span>{msg.scopeLabel}</span>}
              </div>
              <p className="leading-relaxed">{msg.content}</p>
            </div>
          ))
        )}

        {isRevising && (
          <div className="flex items-center gap-2 rounded border border-border bg-app p-2.5 text-meta text-text-secondary">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            <span>Computing schema diff & validating nodes...</span>
          </div>
        )}
      </div>

      {/* Bottom Prompt Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendInstruction();
        }}
        className="border-t border-border p-3 bg-panel space-y-2"
      >
        <textarea
          rows={2}
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendInstruction();
            }
          }}
          placeholder={
            selectedNode
              ? `Describe changes for "${selectedNode.name}"...`
              : 'Describe layout, color, or component revisions...'
          }
          className="w-full rounded-control border border-border bg-app p-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
        />

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-meta text-text-muted">
            <Paperclip className="h-3 w-3" />
            <span>{attachedRefs.length} ref(s) active</span>
          </span>

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isRevising}
            className="inline-flex items-center gap-1.5 rounded-control bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            <span>Revise</span>
            <Send className="h-3 w-3" />
          </button>
        </div>
      </form>
    </div>
  );
}
