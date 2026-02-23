import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// POST /api/likes - Like/Dislike content
export async function POST(req: Request) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { isUpvote, postId, commentId, articleId, sightingId } = await req.json();

    if (!postId && !commentId && !articleId && !sightingId) {
      return NextResponse.json({ message: 'Target ID is required' }, { status: 400 });
    }

    // Upsert logic for like/dislike
    const where: any = { userId };
    if (postId) where.postId = postId;
    else if (commentId) where.commentId = commentId;
    else if (articleId) where.articleId = articleId;
    else if (sightingId) where.sightingId = sightingId;

    const existingLike = await prisma.like.findFirst({ where });

    if (existingLike) {
      // Toggle or remove if clicking same button twice (optional logic)
      if (existingLike.isUpvote === isUpvote) {
        await prisma.like.delete({ where: { id: existingLike.id } });
        return NextResponse.json({ liked: false, message: 'Like removed' });
      } else {
        await prisma.like.update({ 
          where: { id: existingLike.id },
          data: { isUpvote }
        });
        return NextResponse.json({ liked: true, isUpvote, message: 'Like updated' });
      }
    } else {
      await prisma.like.create({
        data: {
          userId,
          isUpvote,
          postId,
          commentId,
          articleId,
          sightingId
        }
      });
      return NextResponse.json({ liked: true, isUpvote, message: 'Like created' });
    }
  } catch (error) {
    console.error('API Error /api/likes:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
