import { create } from 'zustand';
import {
  INITIAL_AGENT_CONFIGS,
  testAgentConnection,
} from '../services/agent-adapters/agentRegistry.js';
import { dbGetAll, dbPut, STORES } from '../services/storage/indexedDb.js';

export const useAgentStore = create((set, get) => ({
  agents: INITIAL_AGENT_CONFIGS,
  activeAgentId: 'local-deterministic-engine',
  bridgeStatus: {
    online: false,
    version: null,
    approvedDirectories: [],
    detectedAgents: {},
  },
  testingAgentId: null,
  loaded: false,

  initAgents: async () => {
    const saved = await dbGetAll(STORES.AGENTS);
    if (saved && saved.length > 0) {
      const merged = INITIAL_AGENT_CONFIGS.map((def) => {
        const match = saved.find((s) => s.id === def.id);
        return match ? { ...def, ...match } : def;
      });
      set({ agents: merged, loaded: true });
    } else {
      for (const agent of INITIAL_AGENT_CONFIGS) {
        await dbPut(STORES.AGENTS, agent);
      }
      set({ agents: INITIAL_AGENT_CONFIGS, loaded: true });
    }
    get().checkBridgeHealth();
  },

  setActiveAgent: (agentId) => {
    set({ activeAgentId: agentId });
  },

  getActiveAgent: () => {
    const { agents, activeAgentId } = get();
    return agents.find((a) => a.id === activeAgentId) || agents[0];
  },

  updateAgentConfig: async (agentId, updates) => {
    const nextAgents = get().agents.map((agent) =>
      agent.id === agentId
        ? {
            ...agent,
            ...updates,
            connection: {
              ...(agent.connection || {}),
              status: updates.status || agent.status,
            },
          }
        : agent
    );
    set({ agents: nextAgents });
    const updated = nextAgents.find((a) => a.id === agentId);
    if (updated) {
      await dbPut(STORES.AGENTS, updated);
    }
  },

  testConnection: async (agentId) => {
    const agent = get().agents.find((a) => a.id === agentId);
    if (!agent) return null;

    set({ testingAgentId: agentId });
    const result = await testAgentConnection(agent);
    const nextStatus = result.status || (result.connected ? 'connected' : 'error');

    await get().updateAgentConfig(agentId, {
      status: nextStatus,
      lastTestedAt: new Date().toISOString(),
      lastMessage: result.message,
      availableModels:
        Array.isArray(result.models) && result.models.length > 0
          ? result.models
          : agent.availableModels,
    });

    set({ testingAgentId: null });
    return result;
  },

  checkBridgeHealth: async () => {
    try {
      const res = await fetch('/bridge/status', {
        headers: { 'X-Layora-Client': 'web-workspace' },
      });
      if (res.ok) {
        const data = await res.json();
        set({
          bridgeStatus: {
            online: true,
            version: data.version || '0.1.0',
            approvedDirectories: data.approvedDirectories || [],
            detectedAgents: data.detectedAgents || {},
          },
        });
        return true;
      }
    } catch {
      // Bridge offline
    }
    set((state) => ({
      bridgeStatus: { ...state.bridgeStatus, online: false },
    }));
    return false;
  },

  approveBridgeDirectory: async (dirPath) => {
    try {
      const res = await fetch('/bridge/approve-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directoryPath: dirPath }),
      });
      const data = await res.json();
      if (res.ok) {
        set((state) => ({
          bridgeStatus: {
            ...state.bridgeStatus,
            online: true,
            approvedDirectories: data.approvedDirectories || [],
          },
        }));
      }
      return data;
    } catch (err) {
      return { error: err.message };
    }
  },
}));
