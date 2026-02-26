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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        profilePath: true,
        profileFolder: true,
        role: true,
        notificationSettings: true,
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const { role, ...userWithoutRole } = user;

    return NextResponse.json({
      ...userWithoutRole,
      plan: role,
      notificationSettings: user.notificationSettings 
        ? (typeof user.notificationSettings === 'string' ? JSON.parse(user.notificationSettings) : user.notificationSettings)
        : {}
    });
  } catch (error) {
    console.error('API Error /api/auth/me:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
