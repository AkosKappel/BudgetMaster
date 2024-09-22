import { z } from 'zod';

import { isFile } from '@/lib/utils';

export const importSchema = z
  .object({
    rawText: z.string().optional(),
    files: z.array(z.custom<File>((value) => isFile(value) || value === undefined)).optional(),
  })
  .refine((data) => data.rawText || data.files?.length, {
    message: 'Either text or a file must be provided',
  });

export type ImportData = z.infer<typeof importSchema>;
