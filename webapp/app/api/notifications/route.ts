import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/notifications - Fetch user notifications
export async function GET(req: Request) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const onlyUnread = searchParams.get('onlyUnread') === 'true';

    const where: any = { userId };
    if (onlyUnread) where.read = false;

    const notifications = await prisma.notification.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('API Error /api/notifications:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(req: Request) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids)) {
      // If no IDs provided, mark ALL as read
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true }
      });
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    await prisma.notification.updateMany({
      where: {
        userId,
        id: { in: ids }
      },
      data: { read: true }
    });

    return NextResponse.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('API Error /api/notifications:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications - Clear notifications
export async function DELETE(req: Request) {
  try {
    const userId = verifyToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    if (id) {
        await prisma.notification.delete({
            where: { userId, id }
        });
        return NextResponse.json({ message: 'Notification deleted' });
    }

    await prisma.notification.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('API Error /api/notifications:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
