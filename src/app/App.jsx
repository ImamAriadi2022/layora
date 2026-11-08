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
  );
}
