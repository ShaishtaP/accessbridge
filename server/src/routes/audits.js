import { Router } from 'express';
import { createAudit, listAudits, getAudit } from '../controllers/auditController.js';
import { validate } from '../middleware/validate.js';
import { createAuditSchema } from '../schemas/auditSchemas.js';

// Mounted at /api/workspaces/:id/audits; mergeParams exposes the workspace :id here.
const router = Router({ mergeParams: true });

router.get('/', listAudits);
router.post('/', validate(createAuditSchema), createAudit);
router.get('/:jobId', getAudit);

export default router;
