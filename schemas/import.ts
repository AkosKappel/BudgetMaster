import { z } from 'zod';

export const importSchema = z
  .object({
    rawText: z.string().optional(),
    file: z.instanceof(File).optional(),
  })
  .refine((data) => data.rawText || data.file, {
    message: 'Either text or file must be provided',
  });

export type ImportData = z.infer<typeof importSchema>;
