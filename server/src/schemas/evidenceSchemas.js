import { z } from 'zod';
import { PHASES } from '../models/Evidence.js';

export const keyboardNoteSchema = z.object({
  note: z.string().trim().min(1, 'Describe the keyboard steps and what happened').max(4000, 'Note is too long'),
  phase: z.enum(PHASES).default('before'),
});

// Multipart form fields arrive as strings alongside the uploaded file.
export const screenshotFieldsSchema = z.object({
  caption: z.string().trim().max(500, 'Caption is too long').default(''),
  phase: z.enum(PHASES).default('before'),
});
