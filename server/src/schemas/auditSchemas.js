import { z } from 'zod';

export const createAuditSchema = z.object({
  pageId: z.string().trim().regex(/^[a-f\d]{24}$/i, 'pageId must be a valid id'),
});
