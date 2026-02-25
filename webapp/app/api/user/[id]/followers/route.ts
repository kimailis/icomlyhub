import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const followers = await prisma.userFollow.findMany({
      where: { followingId: userId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            profilePath: true,
            role: true,
            bio: true
          }
        }
      }
    });

    return NextResponse.json(followers.map(f => ({
        ...f.follower,
        followedAt: f.createdAt,
        type: 'user'
    })));
  } catch (error) {
    console.error('API Error /api/user/[id]/followers:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
