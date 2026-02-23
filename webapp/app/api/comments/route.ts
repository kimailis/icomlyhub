import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

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

    return NextResponse.json(comment);
  } catch (error) {
    console.error('API Error /api/comments:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
