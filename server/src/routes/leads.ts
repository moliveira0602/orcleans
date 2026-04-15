import { Router, Request, Response, NextFunction } from 'express';
import * as leadController from '../controllers/leadController.js';
import { validate } from '../middleware/validate.js';
import { createLeadSchema, updateLeadSchema } from '../types/leads.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const ALLOWED_ORIGINS = ['https://orca.etos.pt', 'http://localhost:5173'];

const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
};

router.use(corsMiddleware);
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
