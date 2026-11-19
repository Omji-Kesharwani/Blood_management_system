import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Always set on global to prevent multiple instances during hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = client;
}

export default client;
