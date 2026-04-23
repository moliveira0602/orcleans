import { Router } from 'express';
import * as organizationController from '../controllers/organizationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, organizationController.getMyOrganization);
router.post('/rotate-key', authenticate, organizationController.rotateApiKey);

export default router;
