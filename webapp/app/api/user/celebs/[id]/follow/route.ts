import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redisClient from '@/lib/redis';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: celebId } = await params;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;

    // Check if following exists
    const existingFollow = await prisma.follow.findUnique({
      where: {
        userId_celebrityId: {
          userId,
          celebrityId: celebId
        }
      }
    });

    if (existingFollow) {
      // Unfollow
      await prisma.$transaction([
        prisma.follow.delete({
          where: {
            userId_celebrityId: {
              userId,
              celebrityId: celebId
            }
          }
        }),
        prisma.celebrity.update({
          where: { id: celebId },
          data: { followerCount: { decrement: 1 } }
        })
      ]);
    } else {
      // Follow
      await prisma.$transaction([
        prisma.follow.create({
          data: {
            userId,
            celebrityId: celebId
          }
        }),
        prisma.celebrity.update({
          where: { id: celebId },
          data: { followerCount: { increment: 1 } }
        })
      ]);
    }

    // Invalidate caches
    await Promise.all([
        redisClient.del(`profile:${celebId}`),
        redisClient.del('celebs:top')
    ]);

    // Get updated following list
    const following = await prisma.follow.findMany({
      where: { userId },
      select: { celebrityId: true }
    });

    return NextResponse.json({
      following: following.map(f => f.celebrityId)
    });
  } catch (error) {
    console.error('API Error /api/user/celebs/[id]/follow:', error);
    return NextResponse.json({ message: 'Failed to toggle follow' }, { status: 500 });
  }
}
