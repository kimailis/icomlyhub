import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { NotificationService } from '@/lib/services/notification.service';

// GET /api/comments - Fetch comments for a specific target
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    const articleId = searchParams.get('articleId');
    const sightingId = searchParams.get('sightingId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');

    const where: any = {};
    if (postId) where.postId = postId;
    else if (articleId) where.articleId = articleId;
    else if (sightingId) where.sightingId = sightingId;
    else {
      return NextResponse.json({ message: 'Missing target ID' }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
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
            likes: true
          }
        }
      }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('API Error /api/comments:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/comments - Create a new comment
export async function POST(req: Request) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { content, postId, articleId, sightingId } = await req.json();

    if (!content) {
      return NextResponse.json({ message: 'Content is required' }, { status: 400 });
    }

    if (!postId && !articleId && !sightingId) {
      return NextResponse.json({ message: 'Target ID is required' }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        postId,
        articleId,
        sightingId
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

    // Trigger notification for comments on posts
    if (postId) {
      NotificationService.notifyComment(userId, { postId, content });
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('API Error /api/comments:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/comments - Delete a comment
export async function DELETE(req: Request) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ message: 'Comment ID is required' }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true }
    });

    if (!comment) {
      return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    }

    if (comment.userId !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await prisma.comment.delete({
      where: { id: commentId }
    });

    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('API Error /api/comments/delete:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
