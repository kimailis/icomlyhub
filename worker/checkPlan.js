require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'ada@gmail.com' },
        select: { id: true, email: true, role: true } // role stores the plan
    });

    console.log('User Status:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
