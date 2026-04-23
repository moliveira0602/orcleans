import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function getOrganization(id: string) {
  return prisma.organization.findUnique({
    where: { id },
  });
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
