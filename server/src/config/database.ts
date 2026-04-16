import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaInitPromise: Promise<PrismaClient> | undefined;
};

async function createPrismaClient(): Promise<PrismaClient> {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
  await client.$connect();
  return client;
}

async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  if (!globalForPrisma.prismaInitPromise) {
    globalForPrisma.prismaInitPromise = createPrismaClient().then(client => {
      globalForPrisma.prisma = client;
      return client;
    });
  }

  return globalForPrisma.prismaInitPromise;
}

export const prisma: PrismaClient = {} as PrismaClient;

getPrisma().then(client => {
  Object.assign(prisma, client);
}).catch(err => {
  console.error('Failed to initialize Prisma:', err);
});