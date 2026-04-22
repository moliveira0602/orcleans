import { Router, Request, Response } from 'express';
import * as leadController from '../controllers/leadController';
import { validate } from '../middleware/validate';
import { createLeadSchema, updateLeadSchema } from '../types/leads';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();

router.use(authenticate);

router.options('*', (_req: Request, res: Response) => res.status(200).end());

// DEBUG: verificar mismatch de organizationId
router.get('/debug/org-mismatch', async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const orgId = authReq.organizationId;
    const leads = await prisma.lead.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { id: true, organizationId: true, nome: true },
    });
    const leadOrgs = await prisma.lead.groupBy({ by: ['organizationId'], _count: true });
    res.json({
      userOrgId: orgId,
      userOrgIdLength: orgId?.length,
      recentLeads: leads,
      leadOrgs,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/dashboard', leadController.getDashboard);
router.get('/', leadController.getLeads);
router.post('/bulk', leadController.createLeadsBulk);
router.post('/bulk-delete', leadController.deleteLeadsBulk);
router.get('/:id', leadController.getLeadById);
router.post('/', validate(createLeadSchema), leadController.createLead);
router.patch('/:id', validate(updateLeadSchema), leadController.updateLead);
router.delete('/:id', leadController.deleteLead);
router.patch('/:id/pipeline', leadController.movePipeline);
router.post('/:id/activity', leadController.logActivity);
router.get('/:id/activities', leadController.getActivities);

export default router;