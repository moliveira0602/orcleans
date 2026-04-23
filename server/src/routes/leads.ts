import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import * as leadController from '../controllers/leadController';
import { validate } from '../middleware/validate';
import { createLeadSchema, updateLeadSchema } from '../types/leads';
import { checkPlanLimits } from '../middleware/plans';

const router = Router();

router.use(authenticate);

router.options('*', (_req: Request, res: Response) => res.status(200).end());

router.get('/dashboard', leadController.getDashboard);
router.get('/', leadController.getLeads);
router.post('/bulk', checkPlanLimits, leadController.createLeadsBulk);
router.post('/bulk-delete', leadController.deleteLeadsBulk);
router.get('/:id', leadController.getLeadById);
router.delete('/', leadController.deleteAllLeads);
router.post('/', checkPlanLimits, validate(createLeadSchema), leadController.createLead);
router.patch('/:id/pipeline', leadController.movePipeline);
router.post('/:id/activity', leadController.logActivity);
router.get('/:id/activities', leadController.getActivities);
router.post('/:id/interactions', leadController.logInteraction);
router.get('/:id/interactions', leadController.getInteractions);
router.post('/:id/enrich', leadController.enrich);

export default router;