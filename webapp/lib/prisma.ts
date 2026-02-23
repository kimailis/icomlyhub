import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Prevent multiple instances in dev mode
export const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString })),
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;