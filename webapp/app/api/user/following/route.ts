import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function GET(req: Request) {
  try {
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

    const following = await prisma.follow.findMany({
      where: { userId },
      include: {
        celebrity: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            noiseRating: true,
            trendDirection: true,
            bio: true,
            category: true,
            articles: {
                take: 10,
                orderBy: { publishedAt: 'desc' }
            },
            sightings: {
                take: 5,
                orderBy: { date: 'desc' }
            },
            _count: {
              select: {
                articles: true
              }
            }
          }
        }
      }
    });

    // For each celeb, calculate how many articles were published after lastViewedAt
    const celebsWithStats = await Promise.all(following.map(async (f: any) => {
        const newArticlesCount = await prisma.article.count({
            where: {
                celebrityId: f.celebrityId,
                publishedAt: {
                    gt: f.lastViewedAt
                }
            }
        });

        return {
            ...f.celebrity,
            newItems: newArticlesCount,
            lastViewedAt: f.lastViewedAt
        };
    }));
    
    return NextResponse.json(celebsWithStats);
  } catch (error) {
    console.error('API Error /api/user/following:', error);
    return NextResponse.json({ message: 'Failed to fetch following list', error }, { status: 500 });
  }
}
