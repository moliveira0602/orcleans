import { prisma } from '../config/database';
import crypto from 'crypto';

export async function getOrganization(id: string) {
  // Sync lead count before returning
  const realCount = await prisma.lead.count({
    where: { organizationId: id }
  });

  const org = await prisma.organization.findUnique({
    where: { id },
  });

  if (!org) return null;

  // Update in background if out of sync
  if (org.leadsConsumed !== realCount) {
    prisma.organization.update({
      where: { id },
      data: { leadsConsumed: realCount }
    }).catch(err => console.error('[OrgService] Sync failed:', err));
  }

  // Define limits for consistency
  const PLAN_LIMITS: Record<string, number> = {
    'trial': 50,
    'starter': 500,
    'pro': 2000,
    'enterprise': 10000
  };

  const effectiveMax = org.maxLeads > 0 ? org.maxLeads : (PLAN_LIMITS[org.plan.toLowerCase()] || 50);

  return {
    ...org,
    leadsConsumed: realCount,
    maxLeads: effectiveMax
  };
}

export async function generateApiKey(organizationId: string) {
  const apiKey = `orca_${crypto.randomBytes(24).toString('hex')}`;
  
  return prisma.organization.update({
    where: { id: organizationId },
    data: { apiKey },
  });
}

export async function validateApiKey(apiKey: string) {
  return prisma.organization.findUnique({
    where: { apiKey },
  });
}
