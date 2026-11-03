import { z } from 'zod';
import { SEVERITIES, STATUSES } from '../models/Issue.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
// WCAG success criteria look like "1.1.1" or "2.4.11".
const wcag = z.string().trim().regex(/^[1-4]\.\d{1,2}\.\d{1,2}$/, 'WCAG criterion must look like 1.4.3');

// "verified" and "reopened" are set by the retest workflow, not by hand.
const MANUAL_STATUSES = STATUSES.filter((s) => s !== 'verified' && s !== 'reopened');

export const createIssueSchema = z.object({
  pageId: objectId,
  title: z.string().trim().min(1, 'Title is required').max(140, 'Title is too long'),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
  severity: z.enum(SEVERITIES),
  wcag,
  ruleId: z.string().trim().max(80).optional(),
  selector: z.string().trim().max(500).optional(),
});

export const updateIssueSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(140, 'Title is too long').optional(),
    description: z.string().trim().max(2000, 'Description is too long').optional(),
    severity: z.enum(SEVERITIES).optional(),
    wcag: wcag.optional(),
    ruleId: z.string().trim().max(80).optional(),
    selector: z.string().trim().max(500).optional(),
    status: z.enum(MANUAL_STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });

// Query-string filters for the issue list; all optional.
export const issueFilterSchema = z.object({
  status: z.enum(STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  pageId: objectId.optional(),
  wcag: wcag.optional(),
});
