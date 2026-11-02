import { Router } from 'express';
import { listPages, createPage, deletePage } from '../controllers/pageController.js';
import { validate } from '../middleware/validate.js';
import { createPageSchema } from '../schemas/pageSchemas.js';

// Mounted at /api/workspaces/:id/pages; mergeParams exposes the workspace :id here.
const router = Router({ mergeParams: true });

router.get('/', listPages);
router.post('/', validate(createPageSchema), createPage);
router.delete('/:pageId', deletePage);

export default router;
