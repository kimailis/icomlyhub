import prisma from './src/config/prisma';

async function main() {
  console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
