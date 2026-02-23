import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/search - Unified search for celebrities and users
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json({ celebrities: [], users: [] });
    }

    // Search celebrities
    const celebrities = await prisma.celebrity.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { id: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        category: true,
        country: true
      }
    });

    // Search users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit,
      select: {
        id: true,
        name: true,
        profilePath: true
      }
    });

    return NextResponse.json({ celebrities, users });
  } catch (error) {
    console.error('API Error /api/search:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
