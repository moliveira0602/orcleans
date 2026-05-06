import type { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import type { AuthRequest } from './auth';

/**
 * Middleware to check if the organization has reached its plan limits.
 * Should be applied to lead creation/import routes.
 */
export async function checkPlanLimits(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    if (!orgId) {
      return res.status(401).json({ error: 'Organização não identificada' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        plan: true,
        maxLeads: true,
        leadsConsumed: true,
        trialExpiresAt: true,
      }
    });

    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 1. Check Trial Expiration
    if (org.plan === 'trial' && org.trialExpiresAt && org.trialExpiresAt < new Date()) {
      return res.status(403).json({ 
        error: 'Seu período de teste expirou.',
        code: 'TRIAL_EXPIRED',
        upgradeRequired: true 
      });
    }

    // 2. Determine max leads based on plan if not explicitly set
    const PLAN_LIMITS: Record<string, number> = {
      'trial': 20,
      'starter': 500,
      'pro': 2000,
      'enterprise': 10000
    };

    const effectiveMaxLeads = org.maxLeads > 0 ? org.maxLeads : (PLAN_LIMITS[org.plan.toLowerCase()] || 20);

    // 3. Check Lead Consumption Limit
    if (org.leadsConsumed >= effectiveMaxLeads) {
      const errorMsg = org.plan === 'trial'
        ? 'Você atingiu o limite de importação gratuita de 20 leads do período de teste. Por favor, entre em contato com a equipe de suporte para liberar mais espaço.'
        : 'Você atingiu o limite de leads do seu plano atual.';

      return res.status(403).json({ 
        error: errorMsg,
        code: 'LIMIT_REACHED',
        upgradeRequired: true,
        currentUsage: org.leadsConsumed,
        maxLimit: effectiveMaxLeads
      });
    }

    next();
  } catch (error) {
    console.error('[PlanMiddleware] Error checking limits:', error);
    res.status(500).json({ error: 'Erro interno ao validar limites do plano' });
  }
}
