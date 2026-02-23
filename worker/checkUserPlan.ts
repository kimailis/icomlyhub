import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'ada@gmail.com' },
        select: { id: true, email: true, plan: true, role: true }
    });

    console.log('User Status:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
