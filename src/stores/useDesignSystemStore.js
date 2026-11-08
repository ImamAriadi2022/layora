import { create } from 'zustand';
import { dbGetById, dbPut, STORES } from '../services/storage/indexedDb.js';

export const DEFAULT_DESIGN_SYSTEM = {
  id: 'ds_default',
  name: 'Layora Core Design System',
  colors: [
    { id: 'token_color_surface', name: 'Surface Primary', value: '#FFFFFF', category: 'Surface' },
    { id: 'token_color_canvas', name: 'Canvas Neutral', value: '#F8FAFC', category: 'Surface' },
    { id: 'token_color_dark', name: 'Slate Dark Surface', value: '#0F172A', category: 'Surface' },
    { id: 'token_color_accent', name: 'Primary Brand Accent', value: '#5B63D3', category: 'Brand' },
    { id: 'token_color_text_primary', name: 'Text Primary', value: '#0F172A', category: 'Text' },
    { id: 'token_color_text_secondary', name: 'Text Secondary', value: '#64748B', category: 'Text' },
    { id: 'token_color_border', name: 'Border Subtle', value: '#E2E8F0', category: 'Border' },
    { id: 'token_color_success', name: 'Status Success', value: '#21845A', category: 'Semantic' },
    { id: 'token_color_warning', name: 'Status Warning', value: '#A96A16', category: 'Semantic' },
    { id: 'token_color_danger', name: 'Status Danger', value: '#C44949', category: 'Semantic' },
  ],
  typography: [
    { id: 'token_type_display', name: 'Display Heading', value: 28, weight: 600, family: 'Inter' },
    { id: 'token_type_h1', name: 'Page Heading H1', value: 22, weight: 600, family: 'Inter' },
    { id: 'token_type_h2', name: 'Section Title H2', value: 16, weight: 600, family: 'Inter' },
    { id: 'token_type_body', name: 'Body Standard', value: 14, weight: 400, family: 'Inter' },
    { id: 'token_type_caption', name: 'Caption & Meta', value: 12, weight: 500, family: 'Inter' },
  ],
  spacing: [
    { id: 'token_space_xs', name: 'Space XS (4px)', value: 4 },
    { id: 'token_space_sm', name: 'Space SM (8px)', value: 8 },
    { id: 'token_space_md', name: 'Space MD (12px)', value: 12 },
    { id: 'token_space_lg', name: 'Space LG (16px)', value: 16 },
    { id: 'token_space_xl', name: 'Space XL (24px)', value: 24 },
    { id: 'token_space_2xl', name: 'Space 2XL (32px)', value: 32 },
  ],
  radii: [
    { id: 'token_radius_none', name: 'Radius None (0px)', value: 0 },
    { id: 'token_radius_sm', name: 'Radius Control (6px)', value: 6 },
    { id: 'token_radius_md', name: 'Radius Card (10px)', value: 10 },
    { id: 'token_radius_lg', name: 'Radius Panel (14px)', value: 14 },
    { id: 'token_radius_pill', name: 'Radius Full Pill', value: 999 },
  ],
  shadows: [
    { id: 'token_shadow_none', name: 'No Elevation', value: 'none' },
    { id: 'token_shadow_sm', name: 'Subtle Card Shadow', value: '0 1px 3px rgba(15, 23, 42, 0.08)' },
    { id: 'token_shadow_md', name: 'Floating Surface', value: '0 8px 20px rgba(15, 23, 42, 0.12)' },
  ],
  components: [
    {
      id: 'comp_button_primary',
      name: 'Primary Button',
      description: 'Standard primary action button with accent fill and medium weight label.',
      category: 'Actions',
      templateNode: {
        type: 'COMPONENT_INSTANCE',
        name: 'Primary Button',
        componentId: 'comp_button_primary',
        width: 'HUG',
        height: 'HUG',
        layout: {
          mode: 'HORIZONTAL',
          gap: 8,
          padding: { top: 10, right: 18, bottom: 10, left: 18 },
          alignment: 'CENTER',
          crossAlignment: 'CENTER',
        },
        style: {
          background: '#5B63D3',
          borderRadius: 6,
        },
        tokenRefs: {
          'style.background': 'token_color_accent',
          'style.borderRadius': 'token_radius_sm',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Button Label',
            text: 'Primary Action',
            style: { color: '#FFFFFF' },
            typography: { fontFamily: 'Inter', fontSize: 13, fontWeight: 500 },
          },
        ],
      },
    },
    {
      id: 'comp_metric_card',
      name: 'KPI Metric Card',
      description: 'Structured telemetry metric card with eyebrow label, value, and status delta.',
      category: 'Data Display',
      templateNode: {
        type: 'COMPONENT_INSTANCE',
        name: 'KPI Metric Card',
        componentId: 'comp_metric_card',
        width: 300,
        height: 'HUG',
        layout: {
          mode: 'VERTICAL',
          gap: 8,
          padding: 20,
          alignment: 'START',
          crossAlignment: 'START',
        },
        style: {
          background: '#FFFFFF',
          borderColor: '#E2E8F0',
          borderWidth: 1,
          borderRadius: 10,
        },
        tokenRefs: {
          'style.background': 'token_color_surface',
          'style.borderColor': 'token_color_border',
          'style.borderRadius': 'token_radius_md',
        },
        children: [
          {
            type: 'TEXT',
            name: 'Metric Label',
            text: 'Total Active Users',
            style: { color: '#64748B' },
            typography: { fontFamily: 'Inter', fontSize: 12, fontWeight: 500 },
          },
          {
            type: 'TEXT',
            name: 'Metric Value',
            text: '24,910',
            style: { color: '#0F172A' },
            typography: { fontFamily: 'Inter', fontSize: 24, fontWeight: 600 },
          },
          {
            type: 'TEXT',
            name: 'Metric Delta',
            text: '+12.4% vs last period',
            style: { color: '#21845A' },
            typography: { fontFamily: 'Inter', fontSize: 12, fontWeight: 500 },
          },
        ],
      },
    },
    {
      id: 'comp_search_input',
      name: 'Search Input Field',
      description: 'Neutral search input container with placeholder and keyboard shortcut hint.',
      category: 'Inputs',
      templateNode: {
        type: 'COMPONENT_INSTANCE',
        name: 'Search Input Field',
        componentId: 'comp_search_input',
        width: 320,
        height: 'HUG',
        layout: {
          mode: 'HORIZONTAL',
          gap: 12,
          padding: { top: 10, right: 14, bottom: 10, left: 14 },
          alignment: 'SPACE_BETWEEN',
          crossAlignment: 'CENTER',
        },
        style: {
          background: '#FFFFFF',
          borderColor: '#CBD5E1',
          borderWidth: 1,
          borderRadius: 6,
        },
        children: [
          {
            type: 'TEXT',
            name: 'Placeholder Text',
            text: 'Search projects or layers...',
            style: { color: '#64748B' },
            typography: { fontFamily: 'Inter', fontSize: 13, fontWeight: 400 },
          },
          {
            type: 'TEXT',
            name: 'Shortcut Badge',
            text: '⌘K',
            style: { color: '#94A3B8' },
            typography: { fontFamily: 'Inter', fontSize: 11, fontWeight: 500 },
          },
        ],
      },
    },
  ],
};

export const useDesignSystemStore = create((set, get) => ({
  designSystem: DEFAULT_DESIGN_SYSTEM,
  loaded: false,

  initDesignSystem: async () => {
    const existing = await dbGetById(STORES.DESIGN_SYSTEMS, 'ds_default');
    if (existing) {
      set({ designSystem: existing, loaded: true });
    } else {
      await dbPut(STORES.DESIGN_SYSTEMS, DEFAULT_DESIGN_SYSTEM);
      set({ designSystem: DEFAULT_DESIGN_SYSTEM, loaded: true });
    }
  },

  updateToken: async (group, tokenId, updates) => {
    const current = get().designSystem;
    const list = current[group];
    if (!Array.isArray(list)) return;

    const updatedList = list.map((item) => (item.id === tokenId ? { ...item, ...updates } : item));
    const nextDs = { ...current, [group]: updatedList };
    set({ designSystem: nextDs });
    await dbPut(STORES.DESIGN_SYSTEMS, nextDs);
  },

  addToken: async (group, newToken) => {
    const current = get().designSystem;
    const list = current[group] || [];
    const tokenWithId = {
      ...newToken,
      id: newToken.id || `token_${group}_${Date.now().toString(36)}`,
    };
    const nextDs = { ...current, [group]: [...list, tokenWithId] };
    set({ designSystem: nextDs });
    await dbPut(STORES.DESIGN_SYSTEMS, nextDs);
    return tokenWithId;
  },

  deleteToken: async (group, tokenId) => {
    const current = get().designSystem;
    const list = current[group] || [];
    const nextDs = { ...current, [group]: list.filter((t) => t.id !== tokenId) };
    set({ designSystem: nextDs });
    await dbPut(STORES.DESIGN_SYSTEMS, nextDs);
  },
}));
