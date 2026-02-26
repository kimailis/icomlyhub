import { getTokenFromCookies, verifyTokenSync } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function getSecurePlan(): Promise<string> {
  const token = await getTokenFromCookies();
  const userId = verifyTokenSync(token || null);
  
  if (!userId) return 'free';

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    return user?.role || 'free';
  } catch (e) {
    console.error('getSecurePlan error:', e);
    return 'free';
  }
}
