import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// POST /api/user/[id]/follow - Follow/Unfollow a user
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const followingId = params.id;
    if (userId === followingId) {
      return NextResponse.json({ message: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if followingId exists
    const targetUser = await prisma.user.findUnique({ where: { id: followingId } });
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const existingFollow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: followingId
        }
      }
    });

    if (existingFollow) {
      await prisma.userFollow.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: followingId
          }
        }
      });
      return NextResponse.json({ following: false, message: 'Unfollowed' });
    } else {
      await prisma.userFollow.create({
        data: {
          followerId: userId,
          followingId: followingId
        }
      });
      return NextResponse.json({ following: true, message: 'Followed' });
    }
  } catch (error) {
    console.error('API Error /api/user/[id]/follow:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
