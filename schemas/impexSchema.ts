import { z } from 'zod';

import { isFile } from '@/lib/utils';

export const bulkImportSchema = z
  .object({
    rawText: z.string().optional(),
    files: z.array(z.custom<File>((value) => isFile(value) || value === undefined)).optional(),
  })
  .refine((data) => data.rawText || data.files?.length, {
    message: 'Either text or a file must be provided',
  });

export type BulkImport = z.infer<typeof bulkImportSchema>;

export const bulkExportSchema = z.object({});

export type BulkExport = z.infer<typeof bulkExportSchema>;
