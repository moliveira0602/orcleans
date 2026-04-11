import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { hashPassword } from '../utils/crypto.js';

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

router.post('/users', async (req: Request, res: Response) => {
  try {
    const { name, email, password, organizationId, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'Organização é obrigatória' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email já registado' });
    }

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return res.status(400).json({ error: 'Organização não encontrada' });
    }

    const userCount = await prisma.user.count({ where: { organizationId } });
    if (userCount >= org.maxUsers) {
      return res.status(400).json({ error: `Limite de ${org.maxUsers} utilizadores atingido para esta organização` });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        organizationId,
        role: role || 'member',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true, plan: true },
        },
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Erro ao criar utilizador' });
  }
});

router.patch('/users/:id/toggle', async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : undefined;

    if (!id) {
      return res.status(400).json({ error: 'ID é obrigatório' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        organization: {
          select: { id: true, name: true, plan: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Toggle user error:', error);
    res.status(500).json({ error: 'Erro ao atualizar utilizador' });
  }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : undefined;

    if (!id) {
      return res.status(400).json({ error: 'ID é obrigatório' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'Utilizador removido com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Erro ao remover utilizador' });
  }
});

router.get('/organizations', async (_req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        plan: true,
        maxLeads: true,
        maxUsers: true,
        _count: {
          select: { users: true, leads: true },
        },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(orgs);
  } catch (error) {
    console.error('Admin organizations error:', error);
    res.status(500).json({ error: 'Erro ao listar organizações' });
  }
});

export default router;