import { z } from 'zod';

import { isFile } from '@/lib/utils';

export const importSchema = z
  .object({
    rawText: z.string().optional(),
    file: z.custom<File>((value) => isFile(value) || value === undefined).optional(),
  })
  .refine((data) => data.rawText || data.file, {
    message: 'Either text or file must be provided',
  });

export type ImportData = z.infer<typeof importSchema>;
