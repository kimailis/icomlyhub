const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const postCount = await prisma.post.count();
  const commentCount = await prisma.comment.count();
  
  console.log('User count:', userCount);
  console.log('Post count:', postCount);
  console.log('Comment count:', commentCount);
  
  const latestUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true }
  });
  console.log('Latest users:', latestUsers);

  const latestPosts = await prisma.post.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, userId: true, content: true }
  });
  console.log('Latest posts:', latestPosts);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
