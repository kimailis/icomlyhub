import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/posts - Fetch posts with filters
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('targetUserId');
    const targetCelebId = searchParams.get('targetCelebId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');

    const where: any = {};
    if (targetUserId) where.targetUserId = targetUserId;
    if (targetCelebId) where.targetCelebId = targetCelebId;
    if (userId) where.userId = userId;

    const posts = await prisma.post.findMany({
      where,
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePath: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('API Error /api/posts:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/posts - Create a new post
export async function POST(req: Request) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { content, picPath, targetUserId, targetCelebId, verified } = await req.body.json();

    if (!content) {
      return NextResponse.json({ message: 'Content is required' }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        content,
        picPath,
        userId,
        targetUserId,
        targetCelebId,
        verified: verified || false // If created as a feed item, needs verification logic
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePath: true
          }
        }
      }
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('API Error /api/posts:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
