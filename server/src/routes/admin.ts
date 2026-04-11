import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      totalOrganizations,
      totalUsers,
      totalLeads,
      activeUsers,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.lead.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    const leadsByOrg = await prisma.lead.groupBy({
      by: ['organizationId'],
      _count: { id: true },
    });

    const usersByOrg = await prisma.user.groupBy({
      by: ['organizationId'],
      _count: { id: true },
    });

    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        plan: true,
        maxLeads: true,
        _count: {
          select: { users: true, leads: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      totalOrganizations,
      totalUsers,
      totalLeads,
      activeUsers,
      leadsByOrg: leadsByOrg.map((g) => ({ orgId: g.organizationId, count: g._count.id })),
      usersByOrg: usersByOrg.map((g) => ({ orgId: g.organizationId, count: g._count.id })),
      organizations,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

router.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Erro ao listar utilizadores' });
  }
});

router.get('/leads', async (_req: Request, res: Response) => {
  try {
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        nome: true,
        segmento: true,
        score: true,
        pipelineStage: true,
        importDate: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { importDate: 'desc' },
      take: 100,
    });

    res.json(leads);
  } catch (error) {
    console.error('Admin leads error:', error);
    res.status(500).json({ error: 'Erro ao listar leads' });
  }
});

export default router;