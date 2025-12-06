import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('⚠️  Database operations will fail. Please set DATABASE_URL in your environment variables.');
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Connection pool optimization
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Add error formatting for better error messages
    errorFormat: 'pretty',
  });

// Handle Prisma connection errors
prisma.$on('error' as never, (e: any) => {
  console.error('Prisma Client Error:', {
    message: e.message,
    target: e.target,
  });
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;




