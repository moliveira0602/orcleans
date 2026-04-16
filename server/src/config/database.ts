import { PrismaClient } from '@prisma/client';

console.log('[DB] Starting Prisma initialization');
console.log('[DB] NODE_ENV:', process.env.NODE_ENV);
console.log('[DB] Prisma client path:', require.resolve('@prisma/client'));

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrisma(): PrismaClient {
  console.log('[DB] getPrisma called, globalForPrisma.prisma:', !!globalForPrisma.prisma);
  
  if (!globalForPrisma.prisma) {
    try {
      console.log('[DB] Creating new PrismaClient');
      globalForPrisma.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
      });
      console.log('[DB] PrismaClient created successfully');
    } catch (error) {
      console.error('[DB] Failed to initialize PrismaClient:', error);
      throw new Error(`PrismaClient initialization failed: ${error}`);
    }
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();
console.log('[DB] Prisma client exported');

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}