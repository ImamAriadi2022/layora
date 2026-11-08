import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '../components/shared/AppShell.jsx';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';
import NewProjectPage from '../features/projects/NewProjectPage.jsx';
import WorkspacePage from '../features/design-canvas/WorkspacePage.jsx';
import ReferenceManagerPage from '../features/references/ReferenceManagerPage.jsx';
import AiAgentsPage from '../features/ai-agents/AiAgentsPage.jsx';
import DesignSystemPage from '../features/design-system/DesignSystemPage.jsx';
import SettingsPage from '../features/projects/SettingsPage.jsx';
import { useProjectStore } from '../stores/useProjectStore.js';
import { useAgentStore } from '../stores/useAgentStore.js';
import { useReferenceStore } from '../stores/useReferenceStore.js';
import { useDesignSystemStore } from '../stores/useDesignSystemStore.js';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-app p-6 text-center">
          <div className="max-w-md rounded-panel border border-border bg-panel p-6 space-y-3">
            <h2 className="text-panel-title text-danger">Workspace Render Error</h2>
            <p className="text-xs font-mono text-text-secondary break-all">
              {this.state.error?.message || 'An unexpected UI error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="rounded-control bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent-hover"
            >
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { initProjects, loaded: projectsLoaded } = useProjectStore();
  const { initAgents } = useAgentStore();
  const { initReferences } = useReferenceStore();
  const { initDesignSystem } = useDesignSystemStore();

  useEffect(() => {
    initProjects();
    initAgents();
    initReferences();
    initDesignSystem();
  }, [initProjects, initAgents, initReferences, initDesignSystem]);

  if (!projectsLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-app text-xs text-text-secondary">
        Initializing Layora Design Workspace...
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<DashboardPage />} />
            <Route path="/projects/new" element={<NewProjectPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/references" element={<ReferenceManagerPage />} />
            <Route path="/agents" element={<AiAgentsPage />} />
            <Route path="/design-system" element={<DesignSystemPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
