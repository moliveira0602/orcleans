import { Router, Request, Response } from 'express';
import * as leadController from '../controllers/leadController.js';
import { validate } from '../middleware/validate.js';
import { createLeadSchema, updateLeadSchema } from '../types/leads.js';
import { authenticate } from '../middleware/auth.js';

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