import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // To handle combined pagination, we'll fetch both and slice, or just fetch sequentially
    // For simplicity with "load more", we'll fetch them in order: Celebs first, then Users
    
    // Total celebrities following count
    const celebFollowingCount = await prisma.follow.count({ where: { userId } });
    
    let result: any[] = [];
    
    // If offset is still within celeb count
    if (offset < celebFollowingCount) {
        const celebs = await prisma.follow.findMany({
            where: { userId },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
            include: {
                celebrity: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                        category: true,
                        noiseRating: true,
                        bio: true
                    }
                }
            }
        });
        result = celebs.map(f => ({
            ...f.celebrity,
            profilePath: f.celebrity.imageUrl, // Map to common name
            followedAt: f.createdAt,
            type: 'celebrity'
        }));
    }

    // If result is smaller than limit, we need to fetch users
    if (result.length < limit) {
        const remainingLimit = limit - result.length;
        const userOffset = Math.max(0, offset - celebFollowingCount + result.length);
        
        const users = await prisma.userFollow.findMany({
            where: { followerId: userId },
            take: remainingLimit,
            skip: userOffset,
            orderBy: { createdAt: 'desc' },
            include: {
                following: {
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
        result = [...result, ...users.map(f => ({
            ...f.following,
            followedAt: f.createdAt,
            type: 'user'
        }))];
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error /api/user/[id]/following:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
