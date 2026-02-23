import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bio: true,
        profilePath: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            userFollowers: true,
            userFollowing: true,
            posts: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      followerCount: user._count.userFollowers,
      followingCount: user._count.userFollowing,
      postCount: user._count.posts
    });
  } catch (error) {
    console.error('API Error /api/user/[id]:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
