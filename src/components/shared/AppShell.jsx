import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  FolderKanban,
  Layers,
  Image as ImageIcon,
  Bot,
  Palette,
  Settings,
  Sun,
  Moon,
  Plus,
} from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore.js';
import { useProjectStore } from '../../stores/useProjectStore.js';
import { useAgentStore } from '../../stores/useAgentStore.js';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, exact: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/workspace', label: 'Workspace', icon: Layers },
  { to: '/references', label: 'References', icon: ImageIcon },
  { to: '/agents', label: 'AI Agents', icon: Bot },
  { to: '/design-system', label: 'Design Systems', icon: Palette },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { activeProjectId, projects } = useProjectStore();
  const { getActiveAgent } = useAgentStore();

  const isWorkspaceRoute = location.pathname.startsWith('/workspace');
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeAgent = getActiveAgent();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app text-text-primary">
      {/* Compact Global Navigation Rail (design.md Section 3.1 & 3.2) */}
      <aside
        aria-label="Global Navigation"
        className="flex w-14 shrink-0 flex-col items-center justify-between border-r border-border bg-panel py-3 z-20"
      >
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Brand Mark */}
          <button
            type="button"
            onClick={() => navigate('/')}
            title="Layora — AI Design Workspace"
            className="flex h-9 w-9 items-center justify-center rounded-control bg-accent text-white font-semibold text-sm tracking-tight focus:outline-none focus:ring-2 focus:ring-accent"
          >
            L
          </button>

          {/* Quick New Project Trigger */}
          <button
            type="button"
            onClick={() => navigate('/projects/new')}
            title="New Project"
            aria-label="New Project"
            className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-panel-muted text-text-primary hover:border-accent hover:text-accent transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>

          <div className="h-px w-7 bg-border" />

          {/* Navigation Destinations */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  title={item.label}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    `group relative flex h-9 w-9 items-center justify-center rounded-control transition-colors ${
                      isActive
                        ? 'bg-accent-subtle text-accent font-medium'
                        : 'text-text-secondary hover:bg-panel-muted hover:text-text-primary'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Controls: Theme Toggle & Active Agent Dot */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/agents')}
            title={`Active Agent: ${activeAgent?.name || 'Local'} (${activeAgent?.status || 'ready'})`}
            aria-label="Active AI Agent Status"
            className="flex h-8 w-8 items-center justify-center rounded-control text-text-secondary hover:bg-panel-muted"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                activeAgent?.status === 'connected' || activeAgent?.status === 'handoff-ready'
                  ? 'bg-success'
                  : activeAgent?.status === 'error'
                  ? 'bg-danger'
                  : 'bg-warning'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
            aria-label="Toggle Theme"
            className="flex h-8 w-8 items-center justify-center rounded-control text-text-secondary hover:bg-panel-muted hover:text-text-primary transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {!isWorkspaceRoute && (
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-panel px-6">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm text-text-primary tracking-tight">Layora</span>
              <span className="text-text-muted">/</span>
              <span className="text-xs font-medium text-text-secondary">
                {location.pathname === '/'
                  ? 'Dashboard'
                  : location.pathname.startsWith('/projects/new')
                  ? 'New Project Setup'
                  : location.pathname.startsWith('/projects')
                  ? 'Projects'
                  : location.pathname.startsWith('/references')
                  ? 'Reference Manager'
                  : location.pathname.startsWith('/agents')
                  ? 'AI Agent Configuration'
                  : location.pathname.startsWith('/design-system')
                  ? 'Design Systems'
                  : 'Settings'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {activeProject && (
                <button
                  type="button"
                  onClick={() => navigate('/workspace')}
                  className="flex items-center gap-2 rounded-control border border-border bg-panel-muted px-3 py-1.5 text-xs font-medium text-text-primary hover:border-accent transition-colors"
                >
                  <Layers className="h-3.5 w-3.5 text-accent" />
                  <span>Open Workspace: {activeProject.name}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/projects/new')}
                className="flex items-center gap-1.5 rounded-control bg-accent px-3 py-1.5 text-btn text-white hover:bg-accent-hover transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Project</span>
              </button>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
