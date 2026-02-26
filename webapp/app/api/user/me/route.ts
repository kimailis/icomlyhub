import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { emailService } from '@/lib/services/email.service';

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
        profileFolder: true,
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
    console.log('[API /user/me PUT] Received body:', JSON.stringify(body));
    const { name, email, bio, profilePath, profileFolder, notificationSettings, role } = body;

    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(bio !== undefined && { bio }),
        ...(profilePath !== undefined && { profilePath }),
        ...(profileFolder !== undefined && { profileFolder }),
        ...(notificationSettings !== undefined && { notificationSettings }),
        ...(role !== undefined && { role }),
      },
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

    // Sync with Email Service (SMTP microservice)
    try {
      if (updatedUser.email) {
        const prefs = updatedUser.notificationSettings ? JSON.parse(updatedUser.notificationSettings) : {};
        
        // Map UI keys (email, weeklyDigest, push) to SMTP keys (gossip_updates, weekly_digest, notifications)
        await emailService.subscribe(
          updatedUser.email, 
          updatedUser.name || updatedUser.email.split('@')[0],
          {
            weekly_digest: prefs.weeklyDigest === true,
            gossip_updates: prefs.email === true,
            notifications: prefs.push === true
          }
        );
      }
    } catch (syncError) {
      console.error('[User API] Failed to sync with Email Service:', syncError);
      // Don't fail the whole request if email sync fails
    }

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
