import { prisma } from '../config/database.js';
import { hashPassword } from './crypto.js';

const SUPER_ADMIN_EMAIL = 'moliveira@etos.pt';
const SUPER_ADMIN_PASSWORD = 'Orca1234!';
const SUPER_ADMIN_NAME = 'Marcos Oliveira';

export async function ensureSuperAdminExists(): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN_EMAIL },
  });

  if (existing) {
    console.log('[SuperAdmin] User already exists:', SUPER_ADMIN_EMAIL);
    return;
  }

  // Find or create organization
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'ETOS',
        plan: 'growth',
        maxLeads: 5000,
        maxUsers: 10,
      },
    });
    console.log('[SuperAdmin] Created organization:', org.id);
  }

  const passwordHash = await hashPassword(SUPER_ADMIN_PASSWORD);

  await prisma.user.create({
    data: {
      organizationId: org.id,
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      role: 'super_admin',
    },
  });

  console.log('[SuperAdmin] Created super admin:', SUPER_ADMIN_EMAIL);
}
