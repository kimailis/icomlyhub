import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createRealClient = () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString || connectionString === 'undefined') {
        throw new Error('DATABASE_URL is not set');
    }
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
};

// Lazy-loaded prisma instance
let _prisma: PrismaClient | null = null;

const getPrisma = (): PrismaClient => {
    if (globalForPrisma.prisma) return globalForPrisma.prisma;
    if (!_prisma) {
        _prisma = createRealClient();
        if (process.env.NODE_ENV !== 'production') {
            globalForPrisma.prisma = _prisma;
        }
    }
    return _prisma;
};

// Use a Proxy to defer instantiation until a property is accessed
export const prisma = new Proxy({} as PrismaClient, {
    get: (target, prop) => {
        // If we are in a build environment and someone is just importing, don't crash
        if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'undefined') {
            if (prop === 'constructor') return PrismaClient;
            // Return a dummy for other props if needed, but ideally don't access them during build
        }
        return (getPrisma() as any)[prop];
    }
});

export default prisma;
