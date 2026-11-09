import { Router } from 'express';
import { listSites, createSite, deleteSite, verifySite } from '../controllers/siteController.js';
import { validate } from '../middleware/validate.js';
import { createSiteSchema } from '../schemas/siteSchemas.js';

// Mounted at /api/workspaces/:id/sites; mergeParams exposes the workspace :id here.
const router = Router({ mergeParams: true });

router.get('/', listSites);
router.post('/', validate(createSiteSchema), createSite);
router.post('/:siteId/verify', verifySite);
router.delete('/:siteId', deleteSite);

export default router;
