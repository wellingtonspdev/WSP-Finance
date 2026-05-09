import dominioSeparatedV1 from './dominio-separated-v1.json';
import type { ExportLayout } from '../../schemas/exportLayoutSchema';
import {
  validateExportLayout,
} from '../../schemas/exportLayoutSchema';

const exportLayouts = [validateExportLayout(dominioSeparatedV1)];

const exportLayoutsById = new Map(
  exportLayouts.map((layout) => [layout.id, layout])
);

export function getExportLayoutById(layoutId: string): ExportLayout {
  const layout = exportLayoutsById.get(layoutId);

  if (!layout) {
    throw new Error(`Export layout not found: ${layoutId}`);
  }

  return layout;
}

export function listExportLayouts(): ExportLayout[] {
  return [...exportLayouts];
}
