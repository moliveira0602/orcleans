import { Router, Request, Response } from 'express';
import * as leadController from '../controllers/leadController';
import { validate } from '../middleware/validate';
import { createLeadSchema, updateLeadSchema } from '../types/leads';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.options('*', (_req: Request, res: Response) => res.status(200).end());

router.get('/dashboard', leadController.getDashboard);
router.get('/', leadController.getLeads);
router.get('/:id', leadController.getLeadById);
router.post('/', validate(createLeadSchema), leadController.createLead);
router.post('/bulk', leadController.createLeadsBulk);
router.patch('/:id', validate(updateLeadSchema), leadController.updateLead);
router.delete('/:id', leadController.deleteLead);
router.delete('/bulk', leadController.deleteLeadsBulk);
router.patch('/:id/pipeline', leadController.movePipeline);

export default router;