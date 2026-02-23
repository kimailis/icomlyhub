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

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        profilePath: true,
        role: true,
        notificationSettings: true,
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      plan: user.role,
      notificationSettings: user.notificationSettings ? JSON.parse(user.notificationSettings) : {}
    });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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

    const body = await req.json();
    const { name, email, bio, profilePath, notificationSettings } = body;

    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(bio && { bio }),
        ...(profilePath && { profilePath }),
        ...(notificationSettings && { notificationSettings }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        profilePath: true,
        role: true,
        notificationSettings: true,
      }
    });

    return NextResponse.json({
      ...updatedUser,
      plan: updatedUser.role,
      notificationSettings: updatedUser.notificationSettings ? JSON.parse(updatedUser.notificationSettings) : {}
    });
  } catch (error) {
    console.error('API Error /api/user/me [PUT]:', error);
    return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
  }
}
