import { Router } from 'express';
import { listIssues, createIssue, getIssue, updateIssue } from '../controllers/issueController.js';
import { validate } from '../middleware/validate.js';
import { createIssueSchema, updateIssueSchema } from '../schemas/issueSchemas.js';
import evidenceRouter from './evidence.js';

// Mounted at /api/workspaces/:id/issues; mergeParams exposes the workspace :id here.
const router = Router({ mergeParams: true });

router.get('/', listIssues);
router.post('/', validate(createIssueSchema), createIssue);
router.get('/:issueId', getIssue);
router.patch('/:issueId', validate(updateIssueSchema), updateIssue);
router.use('/:issueId/evidence', evidenceRouter);

export default router;
