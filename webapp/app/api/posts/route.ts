import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { verificationQueue } from '@/lib/queue'; // Assuming queues are exported here

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

    const { content, targetUserId, targetCelebId, verified, isFeedCandidate } = await req.json();

    if (!content) {
      return NextResponse.json({ message: 'Content is required' }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        content,
        userId,
        targetUserId,
        targetCelebId,
        verified: verified || false,
        isFeedCandidate: isFeedCandidate || false // Only flag if user wants verification
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

    // If flagged as a potential scoop, add to verification pipeline
    if (post.isFeedCandidate) {
      await verificationQueue.add('verify-post', { postId: post.id });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('API Error /api/posts:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/posts - Delete a post
export async function DELETE(req: Request) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ message: 'Post ID is required' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true }
    });

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    if (post.userId !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await prisma.post.delete({
      where: { id: postId }
    });

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('API Error /api/posts/delete:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
