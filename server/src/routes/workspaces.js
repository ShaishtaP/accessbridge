import { Router } from 'express';
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  addMember,
  updateMember,
  removeMember,
} from '../controllers/workspaceController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  createWorkspaceSchema,
  addMemberSchema,
  updateMemberSchema,
} from '../schemas/workspaceSchemas.js';
import pagesRouter from './pages.js';

const router = Router();

// Every workspace route needs a logged-in user.
router.use(requireAuth);

router.post('/', validate(createWorkspaceSchema), createWorkspace);
router.get('/', listWorkspaces);
router.get('/:id', getWorkspace);
router.post('/:id/members', validate(addMemberSchema), addMember);
router.patch('/:id/members/:userId', validate(updateMemberSchema), updateMember);
router.delete('/:id/members/:userId', removeMember);
router.use('/:id/pages', pagesRouter);

export default router;
