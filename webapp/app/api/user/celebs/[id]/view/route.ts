import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

/**
 * Marks a celebrity profile as "viewed" for the current user.
 * This clears the "newItems" badge.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: celebId } = await params;

    // Update lastViewedAt timestamp for this follow relationship
    await prisma.follow.update({
      where: {
        userId_celebrityId: {
          userId,
          celebrityId: celebId
        }
      },
      data: {
        lastViewedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error /api/user/celebs/[id]/view:', error);
    // Silent fail if they aren't following - no need to error
    return NextResponse.json({ success: false });
  }
}
