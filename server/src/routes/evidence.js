import { Router } from 'express';
import {
  loadIssue,
  listEvidence,
  addKeyboardNote,
  addScreenshot,
  downloadFile,
} from '../controllers/evidenceController.js';
import { validate } from '../middleware/validate.js';
import { keyboardNoteSchema } from '../schemas/evidenceSchemas.js';
import { screenshotUpload } from '../config/uploads.js';

// Mounted at /api/workspaces/:id/issues/:issueId/evidence. There are no edit or delete
// routes: evidence is append-only so the audit history can't be rewritten.
const router = Router({ mergeParams: true });

router.use(loadIssue);

router.get('/', listEvidence);
router.post('/notes', validate(keyboardNoteSchema), addKeyboardNote);
router.post('/screenshots', screenshotUpload.single('file'), addScreenshot);
router.get('/:evidenceId/file', downloadFile);

export default router;
