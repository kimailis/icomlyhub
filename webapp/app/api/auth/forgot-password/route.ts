import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { emailService } from '@/lib/services/email.service';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Even if user doesn't exist, we return success to prevent email enumeration
    // but we only send email if user exists
    if (!user) {
      console.log(`[Forgot Password] User not found for email: ${email}`);
      return NextResponse.json({ message: 'If an account exists with this email, a reset code has been sent.' });
    }

    // Generate 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    // Create new token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: otp,
        expiresAt,
      }
    });

    // Send email
    await emailService.sendPasswordResetOTP(email, otp);

    return NextResponse.json({ message: 'If an account exists with this email, a reset code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ message: 'Failed to process request' }, { status: 500 });
  }
}
