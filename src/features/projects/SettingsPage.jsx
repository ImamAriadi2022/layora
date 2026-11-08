import React from 'react';
import { Sun, Moon, Shield, Database, RefreshCw } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore.js';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { useAgentStore } from '../../stores/useAgentStore.js';

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { projects, versions } = useProjectStore();
  const { bridgeStatus, checkBridgeHealth } = useAgentStore();

  return (
    <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-page-title text-text-primary">Workspace Settings</h1>
        <p className="mt-1 text-secondary text-text-secondary">
          Configure theme appearance, local persistence diagnostics, and Local Bridge security controls.
        </p>
      </div>

      {/* Theme Appearance */}
      <section className="rounded-panel border border-border bg-panel p-5 space-y-4">
        <h2 className="text-panel-title text-text-primary">Theme Preference</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center gap-3 rounded-control border p-3.5 text-left ${
              theme === 'light' ? 'border-accent bg-accent-subtle' : 'border-border bg-app'
            }`}
          >
            <Sun className="h-4 w-4 text-accent" />
            <div>
              <div className="text-xs font-semibold text-text-primary">Light Workspace Theme</div>
              <div className="text-meta text-text-secondary">
                Neutral `#F5F6F8` surfaces optimized for high-contrast daylight work.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-3 rounded-control border p-3.5 text-left ${
              theme === 'dark' ? 'border-accent bg-accent-subtle' : 'border-border bg-app'
            }`}
          >
            <Moon className="h-4 w-4 text-accent" />
            <div>
              <div className="text-xs font-semibold text-text-primary">Dark Workspace Theme</div>
              <div className="text-meta text-text-secondary">
                Restrained `#17191D` charcoal surfaces for low-glare studio environments.
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Local Persistence Summary */}
      <section className="rounded-panel border border-border bg-panel p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent" />
          <h2 className="text-panel-title text-text-primary">IndexedDB Local Persistence</h2>
        </div>
        <p className="text-secondary text-text-secondary">
          Projects, canonical Layora Design Schema documents, and version snapshots are stored locally in IndexedDB (`layora_workspace_db`). API credentials are isolated from exported project JSON files.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-1">
          <div className="rounded border border-border bg-app p-3">
            <span className="text-meta text-text-muted block">Stored Projects</span>
            <span className="text-base font-semibold text-text-primary">{projects.length}</span>
          </div>
          <div className="rounded border border-border bg-app p-3">
            <span className="text-meta text-text-muted block">Version Snapshots</span>
            <span className="text-base font-semibold text-text-primary">{versions.length}</span>
          </div>
          <div className="rounded border border-border bg-app p-3">
            <span className="text-meta text-text-muted block">Canonical Schema Version</span>
            <span className="text-base font-semibold font-mono text-text-primary">1.0.0</span>
          </div>
        </div>
      </section>

      {/* Local Bridge Security */}
      <section className="rounded-panel border border-border bg-panel p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            <h2 className="text-panel-title text-text-primary">Local Bridge Security Policy</h2>
          </div>
          <button
            type="button"
            onClick={checkBridgeHealth}
            className="inline-flex items-center gap-1 rounded border border-border bg-panel-muted px-2.5 py-1 text-xs text-text-primary"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Check Status</span>
          </button>
        </div>
        <ul className="space-y-1.5 text-secondary text-text-secondary list-disc list-inside">
          <li>Loopback-only binding (`127.0.0.1:3001`) — never exposed to public interfaces by default.</li>
          <li>Strict `Origin` verification and path-traversal protection on source inspection routes.</li>
          <li>No arbitrary shell command execution from model output; allowlisted binary checks only.</li>
          <li>
            Approved Directories ({bridgeStatus.approvedDirectories?.length || 0}):{' '}
            <span className="font-mono text-meta">
              {(bridgeStatus.approvedDirectories || []).join(', ') || 'Workspace root'}
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
