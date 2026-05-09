import { z } from 'zod';

const exportRecordSchema = z.enum(['0000', '6000', '6100']);

const hasUniqueRecords = (records: readonly string[]) =>
  new Set(records).size === records.length;

export const exportLayoutSchema = z
  .object({
    id: z.string().min(1),
    targetSystem: z.literal('DOMINIO'),
    type: z.literal('delimited'),
    delimiter: z.string().min(1),
    encoding: z.literal('windows-1252'),
    lineEnding: z.literal('CRLF'),
    bom: z.boolean(),
    finalBlankLine: z.boolean(),
    records: z.array(exportRecordSchema).min(1).refine(hasUniqueRecords, {
      message: 'records must not contain duplicates',
    }),
  })
  .strict();

export type ExportLayout = z.infer<typeof exportLayoutSchema>;

export function validateExportLayout(input: unknown): ExportLayout {
  return exportLayoutSchema.parse(input);
}
