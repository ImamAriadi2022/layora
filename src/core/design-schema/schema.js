import { z } from 'zod';

export const SCHEMA_VERSION = '1.0.0';

export const NODE_TYPES = {
  FRAME: 'FRAME',
  TEXT: 'TEXT',
  RECTANGLE: 'RECTANGLE',
  ELLIPSE: 'ELLIPSE',
  IMAGE: 'IMAGE',
  VECTOR: 'VECTOR',
  GROUP: 'GROUP',
  COMPONENT_INSTANCE: 'COMPONENT_INSTANCE',
};

export const LAYOUT_MODES = {
  NONE: 'NONE',
  VERTICAL: 'VERTICAL',
  HORIZONTAL: 'HORIZONTAL',
};

export const ALIGNMENTS = {
  START: 'START',
  CENTER: 'CENTER',
  END: 'END',
  SPACE_BETWEEN: 'SPACE_BETWEEN',
};

export const CROSS_ALIGNMENTS = {
  START: 'START',
  CENTER: 'CENTER',
  END: 'END',
  STRETCH: 'STRETCH',
};

export const SIZING_MODES = {
  FIXED: 'FIXED',
  FILL: 'FILL',
  HUG: 'HUG',
};

export const VIEWPORT_PRESETS = [
  { id: 'desktop', name: 'Desktop (1440×1024)', width: 1440, height: 1024, platform: 'Web' },
  { id: 'laptop', name: 'Laptop (1280×800)', width: 1280, height: 800, platform: 'Web' },
  { id: 'tablet', name: 'Tablet (834×1194)', width: 834, height: 1194, platform: 'Tablet' },
  { id: 'mobile', name: 'Mobile (390×844)', width: 390, height: 844, platform: 'Mobile' },
];

let idCounter = 1;

export function generateNodeId(type = 'node') {
  const prefix = String(type).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const randomPart = Math.random().toString(36).substring(2, 7);
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36).slice(-4)}${randomPart}${idCounter}`;
}

export const PaddingObjectSchema = z.object({
  top: z.number().min(0).default(0),
  right: z.number().min(0).default(0),
  bottom: z.number().min(0).default(0),
  left: z.number().min(0).default(0),
});

export const PaddingSchema = z.union([
  z.number().min(0),
  PaddingObjectSchema,
]);

export const LayoutSchema = z.object({
  mode: z.enum(['NONE', 'VERTICAL', 'HORIZONTAL']).default('VERTICAL'),
  gap: z.number().min(0).default(0),
  padding: PaddingSchema.default(0),
  alignment: z.enum(['START', 'CENTER', 'END', 'SPACE_BETWEEN']).default('START'),
  crossAlignment: z.enum(['START', 'CENTER', 'END', 'STRETCH']).default('STRETCH'),
  widthMode: z.enum(['FIXED', 'FILL', 'HUG']).default('FIXED'),
  heightMode: z.enum(['FIXED', 'FILL', 'HUG']).default('HUG'),
  wrap: z.boolean().default(false),
  clipContent: z.boolean().default(false),
}).partial();

export const StyleSchema = z.object({
  background: z.string().optional(),
  fill: z.string().optional(),
  color: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().min(0).optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().min(0).optional(),
  borderRadius: z.number().min(0).optional(),
  opacity: z.number().min(0).max(1).optional(),
  boxShadow: z.string().optional(),
}).partial();

export const TypographySchema = z.object({
  fontFamily: z.string().default('Inter'),
  fontSize: z.number().min(6).max(240).default(14),
  fontWeight: z.union([z.number(), z.string()]).default(400),
  lineHeight: z.union([z.number(), z.string()]).optional(),
  letterSpacing: z.number().optional(),
  textAlign: z.enum(['LEFT', 'CENTER', 'RIGHT']).default('LEFT'),
}).partial();

export const AssetSchema = z.object({
  src: z.string().optional(),
  fit: z.enum(['COVER', 'CONTAIN', 'FILL']).default('COVER'),
  alt: z.string().optional(),
  iconName: z.string().optional(),
  svgPath: z.string().optional(),
}).partial();

export const BaseNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'FRAME',
    'TEXT',
    'RECTANGLE',
    'ELLIPSE',
    'IMAGE',
    'VECTOR',
    'GROUP',
    'COMPONENT_INSTANCE',
  ]),
  name: z.string().min(1),
  visible: z.boolean().optional().default(true),
  locked: z.boolean().optional().default(false),
  width: z.union([z.number().min(0), z.enum(['FILL', 'HUG', 'AUTO'])]).optional(),
  height: z.union([z.number().min(0), z.enum(['FILL', 'HUG', 'AUTO'])]).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  text: z.string().optional(),
  content: z.string().optional(),
  componentId: z.string().optional(),
  layout: LayoutSchema.optional(),
  style: StyleSchema.optional(),
  typography: TypographySchema.optional(),
  asset: AssetSchema.optional(),
  tokenRefs: z.record(z.string(), z.string()).optional(),
});

export const LayoraNodeSchema = BaseNodeSchema.extend({
  children: z.lazy(() => z.array(LayoraNodeSchema).optional()),
});

export const PageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  viewport: z.object({
    width: z.number().min(200).max(7680).default(1440),
    height: z.number().min(200).max(7680).default(1024),
  }),
  background: z.string().optional().default('#FFFFFF'),
  layout: LayoutSchema.optional(),
  children: z.array(LayoraNodeSchema).default([]),
});

export const DocumentBodySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  viewport: z.object({
    width: z.number().min(200).max(7680).default(1440),
    height: z.number().min(200).max(7680).default(1024),
  }),
  background: z.string().optional().default('#FFFFFF'),
  activePageId: z.string().optional(),
  pages: z.array(PageSchema).optional(),
  layout: LayoutSchema.optional(),
  children: z.array(LayoraNodeSchema).default([]),
});

export const LayoraDocumentSchema = z.object({
  schemaVersion: z.string().default(SCHEMA_VERSION),
  document: DocumentBodySchema,
  metadata: z.object({
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    generatedBy: z.string().optional(),
    sourceMode: z.enum(['scratch', 'source-code', 'manual']).optional(),
  }).optional(),
});
