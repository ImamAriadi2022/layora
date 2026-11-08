import { create } from 'zustand';
import { dbDelete, dbGetAll, dbPut, STORES } from '../services/storage/indexedDb.js';

export const REFERENCE_TYPES = [
  { id: 'visual', label: 'Visual / Screenshot', description: 'UI screenshot, mockup, or wireframe image' },
  { id: 'website', label: 'Website URL', description: 'Live website URL or reference page' },
  { id: 'design', label: 'Design Export', description: 'Exported design specification or layout sheet' },
  { id: 'component', label: 'Component Reference', description: 'Specific UI pattern, table, or card layout' },
  { id: 'brand', label: 'Brand Assets & Guidelines', description: 'Color palette, typography rules, or logo mark' },
  { id: 'source', label: 'Source Code Reference', description: 'Selected source files or repository structure' },
];

const SEED_REFERENCES = [
  {
    id: 'ref_seed_1',
    projectId: 'proj_vortex_cloud',
    name: 'Cloud Telemetry Layout Reference',
    type: 'visual',
    source: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
    notes: 'Use high-contrast dark sidebar with 3-column KPI metric row at the top of the workspace.',
    status: 'ready',
    attachedToTask: true,
    createdAt: '2026-11-08T09:05:00.000Z',
  },
  {
    id: 'ref_seed_2',
    projectId: 'proj_vortex_cloud',
    name: 'Vortex Neutral Brand Palette',
    type: 'brand',
    source: 'Brand Guidelines v2.1 (#0F172A, #5B63D3, Inter)',
    previewUrl: null,
    notes: 'Primary surface #F8FAFC, card surface #FFFFFF, border #E2E8F0, brand accent #5B63D3.',
    status: 'ready',
    attachedToTask: true,
    createdAt: '2026-11-08T09:10:00.000Z',
  },
  {
    id: 'ref_seed_3',
    projectId: 'proj_kinetix_mobile',
    name: 'Treasury Vault Card Pattern',
    type: 'component',
    source: 'Mobile Card Spec (390px viewport)',
    previewUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    notes: 'Dark slate card (#0F172A) with multi-currency IBAN footer and 3 quick action buttons.',
    status: 'ready',
    attachedToTask: true,
    createdAt: '2026-11-08T09:20:00.000Z',
  },
];

export const useReferenceStore = create((set, get) => ({
  references: [],
  loaded: false,

  initReferences: async () => {
    const existing = await dbGetAll(STORES.REFERENCES);
    if (existing && existing.length > 0) {
      set({ references: existing, loaded: true });
    } else {
      for (const ref of SEED_REFERENCES) {
        await dbPut(STORES.REFERENCES, ref);
      }
      set({ references: SEED_REFERENCES, loaded: true });
    }
  },

  addReference: async (refInput) => {
    const newRef = {
      id: `ref_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: refInput.projectId || 'global',
      name: String(refInput.name || 'Untitled Reference').trim(),
      type: refInput.type || 'visual',
      source: refInput.source || 'Uploaded file',
      previewUrl: refInput.previewUrl || null,
      notes: refInput.notes || '',
      status: 'ready',
      attachedToTask: refInput.attachedToTask !== false,
      createdAt: new Date().toISOString(),
    };

    const next = [newRef, ...get().references];
    set({ references: next });
    await dbPut(STORES.REFERENCES, newRef);
    return newRef;
  },

  updateReference: async (refId, updates) => {
    const next = get().references.map((r) => (r.id === refId ? { ...r, ...updates } : r));
    set({ references: next });
    const updated = next.find((r) => r.id === refId);
    if (updated) {
      await dbPut(STORES.REFERENCES, updated);
    }
  },

  deleteReference: async (refId) => {
    const next = get().references.filter((r) => r.id !== refId);
    set({ references: next });
    await dbDelete(STORES.REFERENCES, refId);
  },

  toggleReferenceTaskAttachment: async (refId) => {
    const target = get().references.find((r) => r.id === refId);
    if (!target) return;
    await get().updateReference(refId, { attachedToTask: !target.attachedToTask });
  },
}));
