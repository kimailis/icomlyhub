import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, code, password } = await req.json();

    if (!email || !code || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
    }

    // Find the token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token: code,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!resetToken) {
      return NextResponse.json({ message: 'Invalid or expired reset code' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      })
    ]);

    return NextResponse.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ message: 'Failed to reset password' }, { status: 500 });
  }
}
